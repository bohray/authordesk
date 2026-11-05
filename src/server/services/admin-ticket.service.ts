import "server-only";
import { Types } from "mongoose";
import { classifyTicket, getDraftForTicket } from "@/server/ai";
import {
  PRIORITY_RANK,
  UNRESOLVED_STATUSES,
  type TicketStatus,
} from "@/shared/constants/ticket";
import type {
  AdminTicketQuery,
  CreateMessageInput,
  CreateNoteInput,
  UpdateTicketInput,
} from "@/shared/schemas/ticket.schema";
import type {
  AdminTicketDetailDTO,
  AdminTicketListItemDTO,
  DraftDTO,
  TicketNoteDTO,
} from "@/shared/types/dto";
import type { Session } from "../auth/session";
import { Errors } from "../http/errors";
import { toBookDTO } from "../mappers/book.mapper";
import { toAdminListItemDTO, toAdminTicketDetailDTO, toNoteDTO } from "../mappers/ticket.mapper";
import { findBookById } from "../repositories/book.repository";
import { createNote, listNotesForTicket } from "../repositories/ticket-note.repository";
import {
  listEventsForTicket,
  recordEvents,
  type NewTicketEvent,
} from "../repositories/ticket-event.repository";
import {
  findTicketById,
  queryAdminQueue,
  ticketExists,
  touchTicket,
  updateTicket,
} from "../repositories/ticket.repository";
import type { TicketRecord } from "../repositories/types";
import {
  findAdminById,
  findUserById,
  findUsersByIds,
  findUsersWithProfileByIds,
} from "../repositories/user.repository";
import { runAfterResponse } from "./background";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A PENDING classification older than this is assumed lost (e.g. the function was killed). */
const STALE_CLASSIFICATION_MS = 2 * 60 * 1000;

const isUnresolved = (s: TicketStatus) => UNRESOLVED_STATUSES.includes(s);

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export async function listQueue(
  session: Session,
  q: AdminTicketQuery,
): Promise<{ items: AdminTicketListItemDTO[]; total: number }> {
  const { items, total } = await queryAdminQueue({
    statuses: q.status,
    categories: q.category,
    priorities: q.priority,
    assigneeId:
      q.assignee === undefined
        ? undefined
        : q.assignee === "me"
          ? session.userId
          : q.assignee === "unassigned"
            ? null
            : q.assignee,
    createdFrom: q.from ? new Date(`${q.from}T00:00:00.000Z`) : undefined,
    // `to` is a calendar day and is inclusive, so the bound is the start of the next day.
    createdBefore: q.to ? new Date(Date.parse(`${q.to}T00:00:00.000Z`) + DAY_MS) : undefined,
    search: q.q || undefined,
    sort: q.sort,
    skip: (q.page - 1) * q.limit,
    limit: q.limit,
  });

  // One batched user lookup for every author and assignee on the page (no N+1).
  const ids = new Set<string>();
  for (const t of items) {
    ids.add(t.authorId.toString());
    if (t.assigneeId) ids.add(t.assigneeId.toString());
  }
  const users = new Map((await findUsersByIds([...ids])).map((u) => [u._id.toString(), u]));
  return { items: items.map((t) => toAdminListItemDTO(t, users)), total };
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

async function buildDetail(ticket: TicketRecord): Promise<AdminTicketDetailDTO> {
  // Author and assignee come from one batched, projected query; everything runs in parallel.
  const userIds = ticket.assigneeId ? [ticket.authorId, ticket.assigneeId] : [ticket.authorId];
  const [users, book, notes, events] = await Promise.all([
    findUsersWithProfileByIds(userIds),
    ticket.bookId ? findBookById(ticket.bookId) : Promise.resolve(null),
    listNotesForTicket(ticket._id),
    listEventsForTicket(ticket._id),
  ]);
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return toAdminTicketDetailDTO(ticket, {
    author: byId.get(ticket.authorId.toString()) ?? null,
    assignee: ticket.assigneeId ? (byId.get(ticket.assigneeId.toString()) ?? null) : null,
    book: book ? toBookDTO(book) : null,
    notes,
    events,
  });
}

async function loadTicket(ticketId: string) {
  const ticket = await findTicketById(ticketId);
  if (!ticket) throw Errors.notFound("Ticket");
  return ticket;
}

export async function getTicketDetail(ticketId: string): Promise<AdminTicketDetailDTO> {
  const ticket = await loadTicket(ticketId);

  // Self-healing: classification normally runs in `after()` on creation, but a serverless
  // invocation can die before it finishes. Opening the ticket retries it in the background.
  const lastTry = ticket.ai?.lastAttemptAt ?? ticket.createdAt;
  if (ticket.ai?.status === "PENDING" && Date.now() - new Date(lastTry).getTime() > STALE_CLASSIFICATION_MS) {
    runAfterResponse("classifyTicket:self-heal", () => classifyTicket(ticketId));
  }
  return buildDetail(ticket);
}

// ---------------------------------------------------------------------------
// Update (status / classification override / assignment)
// ---------------------------------------------------------------------------

/** resolvedAt follows the status: set when entering a terminal state, cleared on reopen. */
function resolvedAtFor(ticket: TicketRecord, next: TicketStatus) {
  if (isUnresolved(next)) return null;
  return ticket.resolvedAt ?? new Date();
}

export async function updateTicketAsAdmin(
  session: Session,
  ticketId: string,
  input: UpdateTicketInput,
): Promise<AdminTicketDetailDTO> {
  const ticket = await loadTicket(ticketId);
  const set: Record<string, unknown> = {};
  const events: NewTicketEvent[] = [];
  const event = (type: NewTicketEvent["type"], from: string | null, to: string | null) =>
    events.push({ ticketId: ticket._id, type, actorId: session.userId, actorName: session.name, from, to });

  if (input.status !== undefined && input.status !== ticket.status) {
    set.status = input.status;
    set.resolvedAt = resolvedAtFor(ticket, input.status);
    event("STATUS_CHANGED", ticket.status, input.status);
  }

  if (input.category !== undefined && input.category !== ticket.category) {
    // Source ADMIN marks a human override; the AI layer won't overwrite it later.
    set.category = input.category;
    set.categorySource = "ADMIN";
    event("CATEGORY_CHANGED", ticket.category, input.category);
  }

  if (input.priority !== undefined && input.priority !== ticket.priority) {
    set.priority = input.priority;
    set.prioritySource = "ADMIN";
    set.priorityRank = PRIORITY_RANK[input.priority];
    event("PRIORITY_CHANGED", ticket.priority, input.priority);
  }

  if (input.assigneeId !== undefined) {
    const nextId = input.assigneeId === "me" ? session.userId : input.assigneeId;
    const currentId = ticket.assigneeId?.toString() ?? null;
    if (nextId !== currentId) {
      // Both lookups are independent, so run them together instead of back to back.
      const [admin, current] = await Promise.all([
        nextId ? findAdminById(nextId) : Promise.resolve(null),
        currentId ? findUserById(currentId) : Promise.resolve(null),
      ]);
      if (nextId && !admin) {
        throw Errors.validation([
          { in: "body", path: "assigneeId", message: "Assignee must be an existing admin" },
        ]);
      }
      const nextName = admin?.name ?? null;
      set.assigneeId = nextId ? new Types.ObjectId(nextId) : null;
      // Names (not ids) so the timeline reads naturally without extra lookups.
      event("ASSIGNED", current?.name ?? null, nextName);
    }
  }

  if (events.length === 0) return buildDetail(ticket); // pure no-op: nothing written

  const updated = await updateTicket(ticket._id, { $set: set });
  if (!updated) throw Errors.notFound("Ticket");
  await recordEvents(events);
  return buildDetail(updated);
}

// ---------------------------------------------------------------------------
// Reply / notes
// ---------------------------------------------------------------------------

export async function replyAsAdmin(
  session: Session,
  ticketId: string,
  input: CreateMessageInput,
): Promise<AdminTicketDetailDTO> {
  const ticket = await loadTicket(ticketId);
  if (ticket.status === "CLOSED") throw Errors.ticketClosed();

  const now = new Date();
  const set: Record<string, unknown> = {};
  const events: NewTicketEvent[] = [];
  const actor = { ticketId: ticket._id, actorId: session.userId, actorName: session.name };

  if (!ticket.firstResponseAt) set.firstResponseAt = now; // SLA metric: first human response
  if (ticket.status === "OPEN") {
    set.status = "IN_PROGRESS";
    events.push({ ...actor, type: "STATUS_CHANGED", from: "OPEN", to: "IN_PROGRESS" });
  }
  if (!ticket.assigneeId) {
    // Whoever answers an unowned ticket takes ownership of it.
    set.assigneeId = new Types.ObjectId(session.userId);
    events.push({ ...actor, type: "ASSIGNED", from: null, to: session.name });
  }
  events.push({ ...actor, type: "REPLIED", to: input.aiAssisted ? "AI_ASSISTED" : null });

  const updated = await updateTicket(
    ticket._id,
    {
      $push: {
        messages: {
          _id: new Types.ObjectId(),
          senderId: new Types.ObjectId(session.userId),
          senderRole: "ADMIN",
          senderName: session.name,
          body: input.body,
          aiAssisted: input.aiAssisted ?? false,
          createdAt: now,
        },
      },
      ...(Object.keys(set).length ? { $set: set } : {}),
    },
    { status: { $ne: "CLOSED" } },
  );
  if (!updated) throw Errors.ticketClosed();
  await recordEvents(events);
  return buildDetail(updated);
}

export async function addNote(
  session: Session,
  ticketId: string,
  input: CreateNoteInput,
): Promise<TicketNoteDTO> {
  if (!(await ticketExists(ticketId))) throw Errors.notFound("Ticket");
  const note = await createNote({
    ticketId,
    adminId: session.userId,
    adminName: session.name,
    body: input.body,
  });
  await Promise.all([
    recordEvents([
      { ticketId, type: "NOTE_ADDED", actorId: session.userId, actorName: session.name },
    ]),
    // Notes live in their own collection; bump the ticket so other admins' polls refresh it.
    touchTicket(ticketId),
  ]);
  return toNoteDTO(note);
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export async function getDraft(ticketId: string, regenerate = false): Promise<DraftDTO> {
  if (!(await ticketExists(ticketId))) throw Errors.notFound("Ticket");
  return getDraftForTicket(ticketId, { regenerate });
}

export async function retryClassification(ticketId: string): Promise<AdminTicketDetailDTO> {
  // Cheap existence check first; the full document is read once, after classification.
  if (!(await ticketExists(ticketId))) throw Errors.notFound("Ticket");
  await classifyTicket(ticketId); // never throws; failures are recorded on the ticket
  return buildDetail(await loadTicket(ticketId));
}
