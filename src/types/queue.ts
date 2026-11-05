import type { TicketCategory, TicketPriority, TicketStatus } from "@/shared/constants/ticket";

export type QueueSort = "urgency" | "newest" | "oldest";
export type QueueAssignee = "me" | "unassigned";

/** Normalised admin queue filters, derived from (and written back to) the URL. */
export interface AdminQueueQuery {
  /** Empty array = all statuses. */
  status: TicketStatus[];
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignee: QueueAssignee | null;
  from: string | null;
  to: string | null;
  q: string;
  sort: QueueSort;
  page: number;
}

/** Author ticket list tab. */
export type AuthorTicketTab = "all" | "open" | "resolved";
