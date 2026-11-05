/**
 * Admin queue UI constants: filter options, labels and render configs.
 * Domain values come from `@/shared/constants/ticket` (the same enums the API validates),
 * so the UI can never offer an option the server would reject.
 */
import {
  queueSorts,
  unresolvedStatuses,
  type QueueAssignee,
  type QueueSort,
  type TicketPriority,
  type TicketStatus,
} from "@/shared/constants/ticket";
import { ticketCategoryOptions, ticketPriorityOptions } from "@/constants/adminTicket";
import { uiMessages } from "@/constants/messages";
import { routes } from "@/constants/routes";
import type { AdminQueueQuery } from "@/types/queue";

export interface FilterOption {
  value: string;
  label: string;
}

/** Select value meaning "no filter" (Base UI Select needs a non-empty value). */
export const anyFilterValue = "any";

/** URL value for the "All statuses" view (absence of `status` means the default view). */
export const allStatusesParam = "ALL";

/** Default queue view: what still needs ops attention. */
export const defaultQueueStatus: readonly TicketStatus[] = unresolvedStatuses;

/** Shared height for every control in the filter bar so the row lines up. */
export const filterControlClass = "h-9";

export const queueSortLabels = {
  urgency: "Most urgent",
  newest: "Newest",
  oldest: "Oldest",
} as const satisfies Record<QueueSort, string>;

export const queueAssigneeLabels = {
  me: "Assigned to me",
  unassigned: "Unassigned",
} as const satisfies Record<QueueAssignee, string>;

const withAny = (anyLabel: string, options: FilterOption[]): FilterOption[] => [
  { value: anyFilterValue, label: anyLabel },
  ...options,
];

export const queueSortOptions: FilterOption[] = queueSorts.map((s) => ({
  value: s,
  label: queueSortLabels[s],
}));

/** Filter keys rendered as a single-choice select with an "any" option. */
export type QueueSelectFilterKey = "category" | "priority" | "assignee";

/** Config-driven select filters: rendered with one `.map()` in the filter bar. */
export const queueSelectFilters: {
  key: QueueSelectFilterKey;
  label: string;
  options: FilterOption[];
}[] = [
  {
    key: "category",
    label: "Category",
    options: withAny("All categories", ticketCategoryOptions),
  },
  {
    key: "priority",
    label: "Priority",
    options: withAny("All priorities", ticketPriorityOptions),
  },
  {
    key: "assignee",
    label: "Assignee",
    options: withAny(
      "Anyone",
      (Object.keys(queueAssigneeLabels) as QueueAssignee[]).map((a) => ({
        value: a,
        label: queueAssigneeLabels[a],
      })),
    ),
  },
];

/** Date range inputs; each one bounds the other so "from" can't be after "to". */
export const queueDateFilters: {
  key: "from" | "to";
  label: string;
  /** Which sibling value constrains this input, and how. */
  bound: { attr: "min" | "max"; key: "from" | "to" };
}[] = [
  { key: "from", label: "From", bound: { attr: "max", key: "to" } },
  { key: "to", label: "To", bound: { attr: "min", key: "from" } },
];

/** One-click status presets shown before the individual status chips. */
export const queueStatusPresets: { label: string; status: readonly TicketStatus[] }[] = [
  { label: "Unresolved", status: defaultQueueStatus },
  { label: "All", status: [] }, // empty = every status
];

/** Query fields that count as "filtered" (sort and page don't). */
export const queueFilterFields = [
  "category",
  "priority",
  "assignee",
  "from",
  "to",
] as const satisfies readonly (keyof AdminQueueQuery)[];

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

/** Fallback shown in the Book column for account-level tickets. */
export const generalBookLabel = "General";

/** Empty-state copy for the queue, with and without active filters. */
export const queueEmptyCopy = {
  filtered: {
    title: uiMessages.queue.emptyBody,
    description: "Try widening the filters or clearing the search.",
  },
  unfiltered: {
    title: uiMessages.queue.emptyTitle,
    description: "No unresolved tickets right now. New tickets will appear here automatically.",
  },
} as const;

/** Single-value queue filters that other pages can deep-link to. */
export interface QueueLinkParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee?: QueueAssignee;
  sort?: QueueSort;
}

/** Queue URL with the given filters applied (same params `useQueueFilters` reads). */
export function queueHref(params: QueueLinkParams): string {
  const defined = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  const qs = new URLSearchParams(defined).toString();
  return qs ? `${routes.admin.tickets}?${qs}` : routes.admin.tickets;
}
