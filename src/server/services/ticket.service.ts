import "server-only";
import { Types } from "mongoose";
import { classifyTicket } from "@/server/ai";
import { GENERAL_BOOK_OPTION } from "@/shared/constants/ticket";
import type { CreateMessageInput, CreateTicketInput } from "@/shared/schemas/ticket.schema";
import type { AuthorTicketDTO } from "@/shared/types/dto";
import type { Session } from "../auth/session";
import { nextSequence } from "../db/models";
import { Errors } from "../http/errors";
import { toAuthorTicketDTO } from "../mappers/ticket.mapper";
import { findBookForAuthor } from "../repositories/book.repository";
import { recordEvents } from "../repositories/ticket-event.repository";
import {
  createTicket,
  findTicketForAuthor,
  listTicketsForAuthor,
  updateTicket,
} from "../repositories/ticket.repository";
import { runAfterResponse } from "./background";

/**
 * Author-side ticket operations. Every query is scoped by the session's userId, so an
 * author can only ever see or touch their own tickets.
 */

export async function listMyTickets(session: Session, page: number, limit: number) {
  const { items, total } = await listTicketsForAuthor(session.userId, (page - 1) * limit, limit);
  return { items: items.map(toAuthorTicketDTO), total };
}

export async function getMyTicket(session: Session, ticketId: string): Promise<AuthorTicketDTO> {
  const ticket = await findTicketForAuthor(ticketId, session.userId);
  // 404 rather than 403 for someone else's ticket, so ids can't be probed for existence.
  if (!ticket) throw Errors.notFound("Ticket");
  return toAuthorTicketDTO(ticket);
}

export async function createMyTicket(session: Session, input: CreateTicketInput): Promise<AuthorTicketDTO> {
  let book: { id: Types.ObjectId; title: string; isbn: string } | null = null;
  if (input.bookId !== GENERAL_BOOK_OPTION) {
    const found = await findBookForAuthor(input.bookId, session.userId);
    if (!found) {
      throw Errors.validation([
        { in: "body", path: "bookId", message: "Select one of your own books" },
      ]);
    }
    book = { id: found._id, title: found.title, isbn: found.isbn };
  }

  const ticket = await createTicket({
    ticketNumber: `T-${await nextSequence("ticket")}`,
    authorId: new Types.ObjectId(session.userId),
    bookId: book?.id ?? null,
    // Snapshot so the ticket still reads correctly if the book is renamed later.
    bookSnapshot: book ? { title: book.title, isbn: book.isbn } : null,
    subject: input.subject,
    description: input.description,
    attachment: input.attachment
      ? { name: input.attachment.name, size: input.attachment.size, type: input.attachment.type }
      : null,
    status: "OPEN",
    ai: {
      status: "PENDING",
      confidence: null,
      reasoning: null,
      model: null,
      error: null,
      attempts: 0,
      lastAttemptAt: null,
      suggestedCategory: null,
      suggestedPriority: null,
    },
  });

  await recordEvents([
    { ticketId: ticket._id, type: "CREATED", actorId: session.userId, actorName: session.name, to: "OPEN" },
  ]);

  // Classification can take seconds (LLM call); the author gets the 201 immediately.
  const id = ticket._id.toString();
  runAfterResponse("classifyTicket", () => classifyTicket(id));

  return toAuthorTicketDTO(ticket);
}

export async function addMyMessage(
  session: Session,
  ticketId: string,
  input: CreateMessageInput,
): Promise<AuthorTicketDTO> {
  const ticket = await findTicketForAuthor(ticketId, session.userId);
  if (!ticket) throw Errors.notFound("Ticket");
  if (ticket.status === "CLOSED") throw Errors.ticketClosed();

  // A follow-up on a resolved ticket means the issue isn't solved: reopen it.
  const reopen = ticket.status === "RESOLVED";
  const message = {
    _id: new Types.ObjectId(),
    senderId: new Types.ObjectId(session.userId),
    senderRole: "AUTHOR" as const,
    senderName: session.name,
    body: input.body, // aiAssisted is deliberately ignored for authors
    aiAssisted: false,
    createdAt: new Date(),
  };

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
      {
        ticketId: ticket._id,
        type: "STATUS_CHANGED",
        actorId: session.userId,
        actorName: session.name,
        from: "RESOLVED",
        to: "OPEN",
      },
    ]);
  }
  return toAuthorTicketDTO(updated);
}
