/** Column headers shared by QueueTable and its skeleton so they can't drift apart. */
export const queueColumns = [
  "Priority",
  "Ticket",
  "Author",
  "Book",
  "Category",
  "Status",
  "Assignee",
  "Age",
  "AI",
] as const;

/** Rows shown while the first page loads (the real page size is larger, but this fills the fold). */
export const queueSkeletonRows = 8;
