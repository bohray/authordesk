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
  UserSummary,
  UserWithProfile,
} from "../repositories/types";
import { iso, isoRequired } from "./common";

/** Shown when a referenced user no longer exists, so a list row never breaks. */
const unknownAuthorName = "Unknown author";
const unknownAdminName = "Unknown admin";
/** Events without an actor (e.g. older records) are attributed to the system. */
const systemActorName = "System";
/** AI status before the first classification attempt has finished. */
const defaultAiStatus = "PENDING";

export function toMessageDTO(message: TicketMessageRecord): TicketMessageDTO {
  return {
    id: message._id.toString(),
    senderRole: message.senderRole,
    senderName: message.senderName,
    body: message.body,
    aiAssisted: Boolean(message.aiAssisted),
    createdAt: isoRequired(message.createdAt),
  };
}

function toBookRef(ticket: Pick<TicketRecord, "bookId" | "bookSnapshot">): TicketBookRefDTO | null {
  if (!ticket.bookId) return null;
  return {
    id: ticket.bookId.toString(),
    title: ticket.bookSnapshot?.title ?? "",
    isbn: ticket.bookSnapshot?.isbn ?? "",
  };
}

function toAttachment(attachment: TicketRecord["attachment"]) {
  // The MIME type is stored but not part of the public contract.
  return attachment ? { name: attachment.name, size: attachment.size } : null;
}

/**
 * Author view. Built field-by-field (an allow-list) so that classification, AI data,
 * assignee and notes can never leak by accident when the ticket schema grows.
 */
export function toAuthorTicketDTO(ticket: AuthorTicketRecord): AuthorTicketDTO {
  return {
    id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    book: toBookRef(ticket),
    attachment: toAttachment(ticket.attachment),
    messages: (ticket.messages ?? []).map(toMessageDTO),
    createdAt: isoRequired(ticket.createdAt),
    updatedAt: isoRequired(ticket.updatedAt),
  };
}

type ListSource = TicketQueueRecord | TicketRecord;

/** Queue rows carry Mongo-computed aggregates; a full ticket computes them from its thread. */
function messageStats(ticket: ListSource) {
  if ("messageCount" in ticket) {
    return { messageCount: ticket.messageCount, lastMessageAt: ticket.lastMessageAt };
  }
  return {
    messageCount: ticket.messages.length,
    lastMessageAt: ticket.messages.at(-1)?.createdAt ?? null,
  };
}

export function toAdminListItemDTO(
  ticket: ListSource,
  users: Map<string, UserSummary>,
): AdminTicketListItemDTO {
  const author = users.get(ticket.authorId.toString());
  const assignee = ticket.assigneeId ? users.get(ticket.assigneeId.toString()) : undefined;
  const { messageCount, lastMessageAt } = messageStats(ticket);
  return {
    id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    category: ticket.category ?? null,
    categorySource: ticket.categorySource ?? null,
    priority: ticket.priority ?? null,
    prioritySource: ticket.prioritySource ?? null,
    aiStatus: ticket.ai?.status ?? defaultAiStatus,
    author: {
      id: ticket.authorId.toString(),
      name: author?.name ?? unknownAuthorName,
      email: author?.email ?? "",
    },
    book: toBookRef(ticket),
    assignee: ticket.assigneeId
      ? { id: ticket.assigneeId.toString(), name: assignee?.name ?? unknownAdminName }
      : null,
    messageCount,
    lastMessageAt: iso(lastMessageAt),
    createdAt: isoRequired(ticket.createdAt),
    updatedAt: isoRequired(ticket.updatedAt),
  };
}

export function toNoteDTO(note: TicketNoteRecord): TicketNoteDTO {
  return {
    id: note._id.toString(),
    adminName: note.adminName,
    body: note.body,
    createdAt: isoRequired(note.createdAt),
  };
}

export function toEventDTO(event: TicketEventRecord): TicketEventDTO {
  return {
    id: event._id.toString(),
    type: event.type,
    actorName: event.actorName || systemActorName,
    from: event.from ?? null,
    to: event.to ?? null,
    createdAt: isoRequired(event.createdAt),
  };
}

export interface AdminDetailContext {
  author: UserWithProfile | null;
  assignee: UserSummary | null;
  book: BookDTO | null;
  notes: TicketNoteRecord[];
  events: TicketEventRecord[];
}

function toAuthorProfileDTO(profile: UserWithProfile["authorProfile"]) {
  if (!profile) return null;
  return {
    code: profile.code,
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    joinedDate: isoRequired(profile.joinedDate),
  };
}

export function toAdminTicketDetailDTO(
  ticket: TicketRecord,
  context: AdminDetailContext,
): AdminTicketDetailDTO {
  const users = new Map<string, UserSummary>();
  for (const user of [context.author, context.assignee]) {
    if (user) users.set(user._id.toString(), user);
  }
  return {
    ...toAdminListItemDTO(ticket, users),
    description: ticket.description,
    attachment: toAttachment(ticket.attachment),
    ai: {
      status: ticket.ai?.status ?? defaultAiStatus,
      confidence: ticket.ai?.confidence ?? null,
      reasoning: ticket.ai?.reasoning ?? null,
      model: ticket.ai?.model ?? null,
      error: ticket.ai?.error ?? null,
    },
    authorProfile: toAuthorProfileDTO(context.author?.authorProfile),
    bookDetails: context.book,
    messages: ticket.messages.map(toMessageDTO),
    notes: context.notes.map(toNoteDTO),
    events: context.events.map(toEventDTO),
    firstResponseAt: iso(ticket.firstResponseAt),
    resolvedAt: iso(ticket.resolvedAt),
  };
}
