/** Layout facts shared by the real books view and its skeleton, so they can't drift apart. */

export const bookTableColumns = [
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

export const summaryCardCount = 5;

/** The last summary card ("Next payout") spans the full row on small screens. */
export const summaryCardClass = (index: number) =>
  index === summaryCardCount - 1 ? "col-span-2 lg:col-span-1" : undefined;
