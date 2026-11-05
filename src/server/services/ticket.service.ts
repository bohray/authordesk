import "server-only";
import { Types } from "mongoose";
import { classifyTicket } from "@/server/ai";
import { generalBookOption } from "@/shared/constants/ticket";
import type { CreateMessageInput, CreateTicketInput } from "@/shared/schemas/ticket.schema";
import type { AuthorTicketDTO } from "@/shared/types/dto";
import type { Session } from "../auth/session";
import { nextTicketNumber } from "../db/models";
import { Errors } from "../http/errors";
import { toAuthorTicketDTO } from "../mappers/ticket.mapper";
import { findBookForAuthor } from "../repositories/book.repository";
import { recordEvents } from "../repositories/ticketEvent.repository";
import {
  createTicket,
  findTicketForAuthor,
  listTicketsForAuthor,
  updateTicket,
  type AuthorTicketRecord,
} from "../repositories/ticket.repository";
import type { BookRecord, TicketAiRecord } from "../repositories/types";
import { runAfterResponse } from "./background";
import { eventActor, newMessage } from "./ticketActivity";

/**
 * Author-side ticket operations. Every query is scoped by the session's userId, so an
 * author can only ever see or touch their own tickets.
 */

/** AI state of a brand-new ticket: classification has not run yet. */
const pendingAiState: TicketAiRecord = {
  status: "PENDING",
  confidence: null,
  reasoning: null,
  model: null,
  error: null,
  attempts: 0,
  lastAttemptAt: null,
  suggestedCategory: null,
  suggestedPriority: null,
};

const notYourBookMessage = "Select one of your own books";

/** 404 rather than 403 for someone else's ticket, so ids can't be probed for existence. */
async function loadMyTicket(session: Session, ticketId: string): Promise<AuthorTicketRecord> {
  const ticket = await findTicketForAuthor(ticketId, session.userId);
  if (!ticket) throw Errors.notFound("Ticket");
  return ticket;
}

/** Resolves the "which book" choice; GENERAL means an account-level ticket with no book. */
async function resolveTicketBook(session: Session, bookId: string): Promise<BookRecord | null> {
  if (bookId === generalBookOption) return null;
  const book = await findBookForAuthor(bookId, session.userId);
  if (!book) {
    throw Errors.validation([{ in: "body", path: "bookId", message: notYourBookMessage }]);
  }
  return book;
}

export async function listMyTickets(session: Session, page: number, limit: number) {
  const { items, total } = await listTicketsForAuthor(session.userId, (page - 1) * limit, limit);
  return { items: items.map(toAuthorTicketDTO), total };
}

export async function getMyTicket(session: Session, ticketId: string): Promise<AuthorTicketDTO> {
  return toAuthorTicketDTO(await loadMyTicket(session, ticketId));
}

export async function createMyTicket(session: Session, input: CreateTicketInput): Promise<AuthorTicketDTO> {
  const book = await resolveTicketBook(session, input.bookId);
  const { attachment } = input;

  const ticket = await createTicket({
    ticketNumber: await nextTicketNumber(),
    authorId: new Types.ObjectId(session.userId),
    bookId: book?._id ?? null,
    // Snapshot so the ticket still reads correctly if the book is renamed later.
    bookSnapshot: book ? { title: book.title, isbn: book.isbn } : null,
    subject: input.subject,
    description: input.description,
    attachment: attachment
      ? { name: attachment.name, size: attachment.size, type: attachment.type }
      : null,
    status: "OPEN",
    ai: { ...pendingAiState },
  });

  await recordEvents([{ ...eventActor(session, ticket._id), type: "CREATED", to: "OPEN" }]);

  // Classification can take seconds (LLM call); the author gets the 201 immediately.
  const ticketIdText = ticket._id.toString();
  runAfterResponse("classifyTicket", () => classifyTicket(ticketIdText));

  return toAuthorTicketDTO(ticket);
}

export async function addMyMessage(
  session: Session,
  ticketId: string,
  input: CreateMessageInput,
): Promise<AuthorTicketDTO> {
  const ticket = await loadMyTicket(session, ticketId);
  if (ticket.status === "CLOSED") throw Errors.ticketClosed();

  // A follow-up on a resolved ticket means the issue isn't solved: reopen it.
  const reopen = ticket.status === "RESOLVED";
  // aiAssisted is deliberately ignored for authors.
  const message = newMessage(session, "AUTHOR", input.body);

  const updated = await updateTicket(
    ticket._id,
    {
      $push: { messages: message },
      ...(reopen ? { $set: { status: "OPEN", resolvedAt: null } } : {}),
    },
    // Guard against an admin closing the ticket between our read and this write.
    { authorId: ticket.authorId, status: { $ne: "CLOSED" } },
  );
  if (!updated) throw Errors.ticketClosed();

  if (reopen) {
    await recordEvents([
      { ...eventActor(session, ticket._id), type: "STATUS_CHANGED", from: "RESOLVED", to: "OPEN" },
    ]);
  }
  return toAuthorTicketDTO(updated);
}
