import "server-only";
import type { BookDTO, MyBooksDTO } from "@/shared/types/dto";
import { toBookDTO } from "../mappers/book.mapper";
import { findBooksByAuthor } from "../repositories/book.repository";
import { PAYOUT_THRESHOLD, nextPayoutDate } from "./royalty-schedule";

/** Published books first, then the most recently published; unpublished (null date) last. */
function compareBooks(a: BookDTO, b: BookDTO) {
  if (a.isPublished !== b.isPublished) return a.isPublished ? -1 : 1;
  const da = a.publicationDate ? Date.parse(a.publicationDate) : -Infinity;
  const db = b.publicationDate ? Date.parse(b.publicationDate) : -Infinity;
  if (da !== db) return db > da ? 1 : -1;
  return a.code.localeCompare(b.code);
}

export async function getMyBooks(authorId: string, today = new Date()): Promise<MyBooksDTO> {
  // An author has a handful of books, so sorting in memory keeps the sort rule in one place.
  const books = (await findBooksByAuthor(authorId)).map(toBookDTO).sort(compareBooks);
  const totals = books.reduce(
    (acc, b) => ({
      copiesSold: acc.copiesSold + b.copiesSold,
      earned: acc.earned + b.royalty.earned,
      paid: acc.paid + b.royalty.paid,
      pending: acc.pending + b.royalty.pending,
    }),
    { copiesSold: 0, earned: 0, paid: 0, pending: 0 },
  );
  return {
    books,
    totals,
    nextPayoutDate: nextPayoutDate(today),
    payoutThreshold: PAYOUT_THRESHOLD,
  };
}
