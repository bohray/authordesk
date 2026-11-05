/** Layout facts shared by the real books view and its skeleton, so they can't drift apart. */

export const BOOK_TABLE_COLUMNS = [
  "Book",
  "Genre",
  "Published",
  "Status",
  "MRP",
  "Copies sold",
  "Earned",
  "Paid",
  "Pending",
  "",
] as const;

export const SUMMARY_CARD_COUNT = 5;

/** The last summary card ("Next payout") spans the full row on small screens. */
export const summaryCardClass = (index: number) =>
  index === SUMMARY_CARD_COUNT - 1 ? "col-span-2 lg:col-span-1" : undefined;
