import "server-only";
import type { Types } from "mongoose";
import { Book } from "../db/models";
import type { BookRecord } from "./types";

type Id = string | Types.ObjectId;

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
