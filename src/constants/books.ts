/**
 * Author books UI constants. Layout facts here are shared by the real books view and its
 * skeleton, so the two can't drift apart.
 */

/** Desktop table headers, in display order. The empty last column holds the "Get help" action. */
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
export type BookTableColumn = (typeof bookTableColumns)[number];

/** Right-aligned (numeric) table columns. */
export const numericBookColumns: ReadonlySet<BookTableColumn> = new Set([
  "MRP",
  "Copies sold",
  "Earned",
  "Paid",
  "Pending",
]);

/** Fields on each mobile book card, in display order. */
export const bookCardFields = [
  "Genre",
  "Published",
  "MRP",
  "Copies sold",
  "Earned",
  "Paid",
  "Pending",
  "Last payout",
] as const;
export type BookCardField = (typeof bookCardFields)[number];

export const summaryCardCount = 5;

/** The last summary card ("Next payout") spans the full row on small screens. */
export const summaryCardClass = (index: number) =>
  index === summaryCardCount - 1 ? "col-span-2 lg:col-span-1" : undefined;

/** Published vs. in-production badge colours. */
export const bookStatusBadgeClasses = {
  published:
    "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25",
  inProduction:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25",
} as const;

/** One-line explanation under the "Next payout" card; amounts arrive already formatted. */
export const payoutSummaryText = {
  nothingPending: (threshold: string) =>
    `Nothing pending right now. Payouts are made when pending royalty reaches ${threshold}.`,
  belowThreshold: (pending: string, threshold: string) =>
    `Your pending ${pending} is below the ${threshold} threshold and rolls over to the next quarter.`,
  scheduled: (pending: string, date: string, threshold: string) =>
    `${pending} is scheduled for ${date}. Minimum payout is ${threshold}.`,
} as const;
