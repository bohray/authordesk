import "server-only";
import mongoose from "mongoose";
import { Book, Ticket, User } from "@/server/db/models";
import { publisherNames } from "../knowledge-base/publisher";
import type { BookRecord, TicketRecord, UserWithProfile } from "@/server/repositories/types";
import type { FactsBook, FactsInput } from "./buildFacts";

const authorProjection = { name: 1, authorProfile: 1 } as const;

function toFactsBook(book: BookRecord): FactsBook {
  return {
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    status: book.status,
    publicationDate: book.publicationDate ?? null,
    mrp: book.mrp ?? null,
    royaltyPerCopy: book.royaltyPerCopy ?? null,
    copiesSold: book.copiesSold ?? 0,
    royalty: {
      earned: book.royalty?.earned ?? 0,
      paid: book.royalty?.paid ?? 0,
      pending: book.royalty?.pending ?? 0,
      lastPayoutDate: book.royalty?.lastPayoutDate ?? null,
    },
    printPartner: book.printPartner ?? null,
    availableOn: book.availableOn ?? [],
  };
}

/** Loads ticket + book + author once and maps them to the pure FactsInput shape. */
export async function loadTicketContext(ticketId: string, now: Date = new Date()) {
  if (!mongoose.isValidObjectId(ticketId)) return null;
  const ticket = await Ticket.findById(ticketId).lean<TicketRecord | null>();
  if (!ticket) return null;

  const [book, author] = await Promise.all([
    ticket.bookId ? Book.findById(ticket.bookId).lean<BookRecord | null>() : Promise.resolve(null),
    User.findById(ticket.authorId)
      .select(authorProjection)
      .lean<Pick<UserWithProfile, "_id" | "name" | "authorProfile"> | null>(),
  ]);

  const facts: FactsInput = {
    now,
    publisher: publisherNames(),
    ticket: {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      createdAt: ticket.createdAt ?? now,
      replyCount: (ticket.messages ?? []).filter((message) => message.senderRole !== "AUTHOR").length,
    },
    book: book ? toFactsBook(book) : null,
    author: author ? { name: author.name, joinedDate: author.authorProfile?.joinedDate ?? null } : null,
  };
  return { ticket, facts };
}
