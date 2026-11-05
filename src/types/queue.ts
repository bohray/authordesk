import type {
  QueueAssignee,
  QueueSort,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/shared/constants/ticket";

// Single source of truth lives in shared constants (also used by the API schema).
export type { QueueAssignee, QueueSort };

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

/** Author ticket list tab (values defined once in constants/tickets). */
export type { AuthorTicketTab } from "@/constants/tickets";
