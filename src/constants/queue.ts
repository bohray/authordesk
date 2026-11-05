/**
 * Admin queue UI constants: filter options, labels and render configs.
 * Domain values come from `@/shared/constants/ticket` (the same enums the API validates),
 * so the UI can never offer an option the server would reject.
 */
import {
  queueSorts,
  ticketCategories,
  ticketCategoryLabels,
  ticketPriorities,
  ticketPriorityLabels,
  unresolvedStatuses,
  type QueueAssignee,
  type QueueSort,
  type TicketStatus,
} from "@/shared/constants/ticket";
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
    options: withAny(
      "All categories",
      ticketCategories.map((c) => ({ value: c, label: ticketCategoryLabels[c] })),
    ),
  },
  {
    key: "priority",
    label: "Priority",
    options: withAny(
      "All priorities",
      ticketPriorities.map((p) => ({ value: p, label: ticketPriorityLabels[p] })),
    ),
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
