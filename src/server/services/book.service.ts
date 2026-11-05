import "server-only";
import type { BookDTO, MyBooksDTO } from "@/shared/types/dto";
import { toBookDTO } from "../mappers/book.mapper";
import { findBooksByAuthor } from "../repositories/book.repository";
import { payoutThreshold, nextPayoutDate } from "./royaltySchedule";

/** Unpublished books (no date) sort after every dated one. */
const publicationTime = (book: BookDTO) =>
  book.publicationDate ? Date.parse(book.publicationDate) : -Infinity;

/** Published books first, then the most recently published; unpublished (null date) last. */
function compareBooks(first: BookDTO, second: BookDTO) {
  if (first.isPublished !== second.isPublished) return first.isPublished ? -1 : 1;
  const firstDate = publicationTime(first);
  const secondDate = publicationTime(second);
  if (firstDate !== secondDate) return secondDate > firstDate ? 1 : -1;
  return first.code.localeCompare(second.code);
}

const emptyTotals = { copiesSold: 0, earned: 0, paid: 0, pending: 0 };

export async function getMyBooks(authorId: string, today = new Date()): Promise<MyBooksDTO> {
  // An author has a handful of books, so sorting in memory keeps the sort rule in one place.
  const books = (await findBooksByAuthor(authorId)).map(toBookDTO).sort(compareBooks);
  const totals = books.reduce(
    (sum, book) => ({
      copiesSold: sum.copiesSold + book.copiesSold,
      earned: sum.earned + book.royalty.earned,
      paid: sum.paid + book.royalty.paid,
      pending: sum.pending + book.royalty.pending,
    }),
    emptyTotals,
  );
  return {
    books,
    totals,
    nextPayoutDate: nextPayoutDate(today),
    payoutThreshold,
  };
}
