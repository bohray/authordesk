import "server-only";
import { Book } from "../db/models";
import type { Id, BookRecord } from "./types";

export function findBooksByAuthor(authorId: Id) {
  return Book.find({ authorId }).lean<BookRecord[]>();
}

/** Ownership-scoped lookup: returns null for a book that belongs to someone else. */
export function findBookForAuthor(bookId: Id, authorId: Id) {
  return Book.findOne({ _id: bookId, authorId }).lean<BookRecord | null>();
}

export function findBookById(id: Id) {
  return Book.findById(id).lean<BookRecord | null>();
}
