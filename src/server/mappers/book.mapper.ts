import "server-only";
import { publishedBookStatus } from "@/shared/constants/book";
import type { BookDTO } from "@/shared/types/dto";
import type { BookRecord } from "../repositories/types";
import { iso } from "./common";

/** The dataset's status string for a book that is on sale. */

export function toBookDTO(book: BookRecord): BookDTO {
  return {
    id: book._id.toString(),
    code: book.code,
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    publicationDate: iso(book.publicationDate),
    status: book.status,
    isPublished: book.status === publishedBookStatus,
    mrp: book.mrp ?? null,
    royaltyPerCopy: book.royaltyPerCopy ?? null,
    copiesSold: book.copiesSold ?? 0,
    royalty: {
      earned: book.royalty?.earned ?? 0,
      paid: book.royalty?.paid ?? 0,
      pending: book.royalty?.pending ?? 0,
      lastPayoutDate: iso(book.royalty?.lastPayoutDate),
    },
    printPartner: book.printPartner ?? null,
    availableOn: book.availableOn ?? [],
  };
}
