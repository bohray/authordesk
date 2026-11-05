import "server-only";
import { Types } from "mongoose";
import { classifyTicket, getDraftForTicket } from "@/server/ai";
import {
  priorityRankByLevel,
  unresolvedStatuses,
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
import { createNote, listNotesForTicket } from "../repositories/ticketNote.repository";
import {
  listEventsForTicket,
  recordEvents,
  type NewTicketEvent,
} from "../repositories/ticketEvent.repository";
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
import { msPerDay, msPerMinute } from "../lib/time";
import { runAfterResponse } from "./background";
import { eventActor, newMessage } from "./ticketActivity";

/** A PENDING classification older than this is assumed lost (e.g. the function was killed). */
const staleClassificationMs = 2 * msPerMinute;
const invalidAssigneeMessage = "Assignee must be an existing admin";

const isUnresolved = (status: TicketStatus) => unresolvedStatuses.includes(status);

/** Index records by their id string, for O(1) lookups while mapping. */
function indexById<T extends { _id: Types.ObjectId }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [record._id.toString(), record]));
}

/** Throws 404 unless the ticket exists. Cheaper than loading the whole document. */
async function assertTicketExists(ticketId: string): Promise<void> {
  if (!(await ticketExists(ticketId))) throw Errors.notFound("Ticket");
}

async function loadTicket(ticketId: string): Promise<TicketRecord> {
  const ticket = await findTicketById(ticketId);
  if (!ticket) throw Errors.notFound("Ticket");
  return ticket;
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

/** Maps the API's assignee filter to a repository criterion: undefined = any, null = unassigned. */
function assigneeCriterion(
  assignee: AdminTicketQuery["assignee"],
  session: Session,
): string | null | undefined {
  if (assignee === "me") return session.userId;
  if (assignee === "unassigned") return null;
  return assignee;
}

/** Start of a calendar day (YYYY-MM-DD) in UTC. */
const startOfUtcDay = (day: string) => new Date(`${day}T00:00:00.000Z`);

export async function listQueue(
  session: Session,
  query: AdminTicketQuery,
): Promise<{ items: AdminTicketListItemDTO[]; total: number }> {
  const { items, total } = await queryAdminQueue({
    statuses: query.status,
    categories: query.category,
    priorities: query.priority,
    assigneeId: assigneeCriterion(query.assignee, session),
    createdFrom: query.from ? startOfUtcDay(query.from) : undefined,
    // `to` is a calendar day and is inclusive, so the bound is the start of the next day.
    createdBefore: query.to
      ? new Date(startOfUtcDay(query.to).getTime() + msPerDay)
      : undefined,
    search: query.q || undefined,
    sort: query.sort,
    skip: (query.page - 1) * query.limit,
    limit: query.limit,
  });

  // One batched user lookup for every author and assignee on the page (no N+1).
  const userIds = new Set<string>();
  for (const ticket of items) {
    userIds.add(ticket.authorId.toString());
    if (ticket.assigneeId) userIds.add(ticket.assigneeId.toString());
  }
  const users = indexById(await findUsersByIds([...userIds]));
  return { items: items.map((ticket) => toAdminListItemDTO(ticket, users)), total };
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
  const usersById = indexById(users);
  return toAdminTicketDetailDTO(ticket, {
    author: usersById.get(ticket.authorId.toString()) ?? null,
    assignee: ticket.assigneeId ? (usersById.get(ticket.assigneeId.toString()) ?? null) : null,
    book: book ? toBookDTO(book) : null,
    notes,
    events,
  });
}

/** True when classification was started but has shown no sign of life for a while. */
function hasStaleClassification(ticket: TicketRecord): boolean {
  if (ticket.ai?.status !== "PENDING") return false;
  const lastTry = ticket.ai.lastAttemptAt ?? ticket.createdAt;
  return Date.now() - new Date(lastTry).getTime() > staleClassificationMs;
}

export async function getTicketDetail(ticketId: string): Promise<AdminTicketDetailDTO> {
  const ticket = await loadTicket(ticketId);

  // Self-healing: classification normally runs in `after()` on creation, but a serverless
  // invocation can die before it finishes. Opening the ticket retries it in the background.
  if (hasStaleClassification(ticket)) {
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

/** A pending ticket write: the `$set` fields plus the timeline events that explain them. */
interface TicketChanges {
  set: Record<string, unknown>;
  events: NewTicketEvent[];
}

type AddEvent = (type: NewTicketEvent["type"], from: string | null, to: string | null) => void;

/**
 * Status and classification overrides. Source ADMIN marks a human override, which the AI
 * layer never overwrites later.
 */
function applyFieldChanges(
  ticket: TicketRecord,
  input: UpdateTicketInput,
  set: Record<string, unknown>,
  addEvent: AddEvent,
) {
  if (input.status !== undefined && input.status !== ticket.status) {
    set.status = input.status;
    set.resolvedAt = resolvedAtFor(ticket, input.status);
    addEvent("STATUS_CHANGED", ticket.status, input.status);
  }

  if (input.category !== undefined && input.category !== ticket.category) {
    set.category = input.category;
    set.categorySource = "ADMIN";
    addEvent("CATEGORY_CHANGED", ticket.category, input.category);
  }

  if (input.priority !== undefined && input.priority !== ticket.priority) {
    set.priority = input.priority;
    set.prioritySource = "ADMIN";
    set.priorityRank = priorityRankByLevel[input.priority];
    addEvent("PRIORITY_CHANGED", ticket.priority, input.priority);
  }
}

/**
 * Assignment change, if any. Returns the previous and next assignee names (for the timeline)
 * or null when the assignee stays the same. Rejects an id that isn't an existing admin.
 */
async function resolveAssignmentChange(
  session: Session,
  ticket: TicketRecord,
  requested: UpdateTicketInput["assigneeId"],
): Promise<{ assigneeId: Types.ObjectId | null; fromName: string | null; toName: string | null } | null> {
  if (requested === undefined) return null;
  const nextId = requested === "me" ? session.userId : requested;
  const currentId = ticket.assigneeId?.toString() ?? null;
  if (nextId === currentId) return null;

  // Both lookups are independent, so run them together instead of back to back.
  const [nextAdmin, currentUser] = await Promise.all([
    nextId ? findAdminById(nextId) : Promise.resolve(null),
    currentId ? findUserById(currentId) : Promise.resolve(null),
  ]);
  if (nextId && !nextAdmin) {
    throw Errors.validation([{ in: "body", path: "assigneeId", message: invalidAssigneeMessage }]);
  }
  return {
    assigneeId: nextId ? new Types.ObjectId(nextId) : null,
    fromName: currentUser?.name ?? null,
    toName: nextAdmin?.name ?? null,
  };
}

export async function updateTicketAsAdmin(
  session: Session,
  ticketId: string,
  input: UpdateTicketInput,
): Promise<AdminTicketDetailDTO> {
  const ticket = await loadTicket(ticketId);
  const set: Record<string, unknown> = {};
  const events: NewTicketEvent[] = [];
  const actor = eventActor(session, ticket._id);
  const addEvent: AddEvent = (type, from, to) => events.push({ ...actor, type, from, to });

  applyFieldChanges(ticket, input, set, addEvent);

  const assignment = await resolveAssignmentChange(session, ticket, input.assigneeId);
  if (assignment) {
    set.assigneeId = assignment.assigneeId;
    // Names (not ids) so the timeline reads naturally without extra lookups.
    addEvent("ASSIGNED", assignment.fromName, assignment.toName);
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

/** Side effects of an admin reply: first-response SLA, OPEN → IN_PROGRESS, auto-assignment. */
function replySideEffects(session: Session, ticket: TicketRecord, now: Date): TicketChanges {
  const set: Record<string, unknown> = {};
  const events: NewTicketEvent[] = [];
  const actor = eventActor(session, ticket._id);

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
  return { set, events };
}

export async function replyAsAdmin(
  session: Session,
  ticketId: string,
  input: CreateMessageInput,
): Promise<AdminTicketDetailDTO> {
  const ticket = await loadTicket(ticketId);
  if (ticket.status === "CLOSED") throw Errors.ticketClosed();

  const now = new Date();
  const { set, events } = replySideEffects(session, ticket, now);
  events.push({
    ...eventActor(session, ticket._id),
    type: "REPLIED",
    to: input.aiAssisted ? "AI_ASSISTED" : null,
  });
  const message = newMessage(session, "ADMIN", input.body, {
    aiAssisted: input.aiAssisted,
    createdAt: now,
  });

  const updated = await updateTicket(
    ticket._id,
    {
      $push: { messages: message },
      ...(Object.keys(set).length ? { $set: set } : {}),
    },
    // Guard against another admin closing the ticket between our read and this write.
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
  await assertTicketExists(ticketId);
  const note = await createNote({
    ticketId,
    adminId: session.userId,
    adminName: session.name,
    body: input.body,
  });
  await Promise.all([
    recordEvents([{ ...eventActor(session, ticketId), type: "NOTE_ADDED" }]),
    // Notes live in their own collection; bump the ticket so other admins' polls refresh it.
    touchTicket(ticketId),
  ]);
  return toNoteDTO(note);
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export async function getDraft(ticketId: string, regenerate = false): Promise<DraftDTO> {
  await assertTicketExists(ticketId);
  return getDraftForTicket(ticketId, { regenerate });
}

export async function retryClassification(ticketId: string): Promise<AdminTicketDetailDTO> {
  // Cheap existence check first; the full document is read once, after classification.
  await assertTicketExists(ticketId);
  await classifyTicket(ticketId); // never throws; failures are recorded on the ticket
  return buildDetail(await loadTicket(ticketId));
}
