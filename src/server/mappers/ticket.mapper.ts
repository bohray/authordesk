import "server-only";
import type {
  AdminTicketDetailDTO,
  AdminTicketListItemDTO,
  AuthorTicketDTO,
  BookDTO,
  TicketBookRefDTO,
  TicketEventDTO,
  TicketMessageDTO,
  TicketNoteDTO,
} from "@/shared/types/dto";
import type { AuthorTicketRecord } from "../repositories/ticket.repository";
import type {
  TicketEventRecord,
  TicketMessageRecord,
  TicketNoteRecord,
  TicketQueueRecord,
  TicketRecord,
  UserRecord,
} from "../repositories/types";
import { iso, isoRequired } from "./common";

type UserLite = Pick<UserRecord, "_id" | "name" | "email">;

export function toMessageDTO(m: TicketMessageRecord): TicketMessageDTO {
  return {
    id: m._id.toString(),
    senderRole: m.senderRole,
    senderName: m.senderName,
    body: m.body,
    aiAssisted: Boolean(m.aiAssisted),
    createdAt: isoRequired(m.createdAt),
  };
}

function toBookRef(t: Pick<TicketRecord, "bookId" | "bookSnapshot">): TicketBookRefDTO | null {
  if (!t.bookId) return null;
  return {
    id: t.bookId.toString(),
    title: t.bookSnapshot?.title ?? "",
    isbn: t.bookSnapshot?.isbn ?? "",
  };
}

function toAttachment(a: TicketRecord["attachment"]) {
  // The MIME type is stored but not part of the public contract.
  return a ? { name: a.name, size: a.size } : null;
}

/**
 * Author view. Built field-by-field (an allow-list) so that classification, AI data,
 * assignee and notes can never leak by accident when the ticket schema grows.
 */
export function toAuthorTicketDTO(t: AuthorTicketRecord): AuthorTicketDTO {
  return {
    id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    status: t.status,
    book: toBookRef(t),
    attachment: toAttachment(t.attachment),
    messages: (t.messages ?? []).map(toMessageDTO),
    createdAt: isoRequired(t.createdAt),
    updatedAt: isoRequired(t.updatedAt),
  };
}

type ListSource = TicketQueueRecord | TicketRecord;

export function toAdminListItemDTO(
  t: ListSource,
  users: Map<string, UserLite>,
): AdminTicketListItemDTO {
  const author = users.get(t.authorId.toString());
  const assignee = t.assigneeId ? users.get(t.assigneeId.toString()) : undefined;
  const messageCount = "messageCount" in t ? t.messageCount : t.messages.length;
  const lastMessageAt =
    "lastMessageAt" in t ? t.lastMessageAt : (t.messages.at(-1)?.createdAt ?? null);
  return {
    id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    category: t.category ?? null,
    categorySource: t.categorySource ?? null,
    priority: t.priority ?? null,
    prioritySource: t.prioritySource ?? null,
    aiStatus: t.ai?.status ?? "PENDING",
    author: {
      id: t.authorId.toString(),
      name: author?.name ?? "Unknown author",
      email: author?.email ?? "",
    },
    book: toBookRef(t),
    assignee: t.assigneeId
      ? { id: t.assigneeId.toString(), name: assignee?.name ?? "Unknown admin" }
      : null,
    messageCount,
    lastMessageAt: iso(lastMessageAt),
    createdAt: isoRequired(t.createdAt),
    updatedAt: isoRequired(t.updatedAt),
  };
}

export function toNoteDTO(n: TicketNoteRecord): TicketNoteDTO {
  return {
    id: n._id.toString(),
    adminName: n.adminName,
    body: n.body,
    createdAt: isoRequired(n.createdAt),
  };
}

export function toEventDTO(e: TicketEventRecord): TicketEventDTO {
  return {
    id: e._id.toString(),
    type: e.type,
    actorName: e.actorName || "System",
    from: e.from ?? null,
    to: e.to ?? null,
    createdAt: isoRequired(e.createdAt),
  };
}

export interface AdminDetailContext {
  author: Pick<UserRecord, "_id" | "name" | "email" | "authorProfile"> | null;
  assignee: UserLite | null;
  book: BookDTO | null;
  notes: TicketNoteRecord[];
  events: TicketEventRecord[];
}

export function toAdminTicketDetailDTO(t: TicketRecord, ctx: AdminDetailContext): AdminTicketDetailDTO {
  const users = new Map<string, UserLite>();
  if (ctx.author) users.set(ctx.author._id.toString(), ctx.author);
  if (ctx.assignee) users.set(ctx.assignee._id.toString(), ctx.assignee);
  const profile = ctx.author?.authorProfile;
  return {
    ...toAdminListItemDTO(t, users),
    description: t.description,
    attachment: toAttachment(t.attachment),
    ai: {
      status: t.ai?.status ?? "PENDING",
      confidence: t.ai?.confidence ?? null,
      reasoning: t.ai?.reasoning ?? null,
      model: t.ai?.model ?? null,
      error: t.ai?.error ?? null,
    },
    authorProfile: profile
      ? {
          code: profile.code,
          phone: profile.phone ?? "",
          city: profile.city ?? "",
          joinedDate: isoRequired(profile.joinedDate),
        }
      : null,
    bookDetails: ctx.book,
    messages: t.messages.map(toMessageDTO),
    notes: ctx.notes.map(toNoteDTO),
    events: ctx.events.map(toEventDTO),
    firstResponseAt: iso(t.firstResponseAt),
    resolvedAt: iso(t.resolvedAt),
  };
}
