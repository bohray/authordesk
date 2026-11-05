/**
 * Admin queue UI constants: filter options, labels and render configs.
 * Domain values come from `@/shared/constants/ticket` (the same enums the API validates),
 * so the UI can never offer an option the server would reject.
 */
import {
  QUEUE_SORTS,
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  UNRESOLVED_STATUSES,
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
export const ANY_FILTER_VALUE = "any";

/** URL value for the "All statuses" view (absence of `status` means the default view). */
export const ALL_STATUSES_PARAM = "ALL";

/** Default queue view: what still needs ops attention. */
export const DEFAULT_QUEUE_STATUS: readonly TicketStatus[] = UNRESOLVED_STATUSES;

/** Shared height for every control in the filter bar so the row lines up. */
export const FILTER_CONTROL_CLASS = "h-9";

export const QUEUE_SORT_LABELS = {
  urgency: "Most urgent",
  newest: "Newest",
  oldest: "Oldest",
} as const satisfies Record<QueueSort, string>;

export const QUEUE_ASSIGNEE_LABELS = {
  me: "Assigned to me",
  unassigned: "Unassigned",
} as const satisfies Record<QueueAssignee, string>;

const withAny = (anyLabel: string, options: FilterOption[]): FilterOption[] => [
  { value: ANY_FILTER_VALUE, label: anyLabel },
  ...options,
];

export const QUEUE_SORT_OPTIONS: FilterOption[] = QUEUE_SORTS.map((s) => ({
  value: s,
  label: QUEUE_SORT_LABELS[s],
}));

/** Filter keys rendered as a single-choice select with an "any" option. */
export type QueueSelectFilterKey = "category" | "priority" | "assignee";

/** Config-driven select filters: rendered with one `.map()` in the filter bar. */
export const QUEUE_SELECT_FILTERS: {
  key: QueueSelectFilterKey;
  label: string;
  options: FilterOption[];
}[] = [
  {
    key: "category",
    label: "Category",
    options: withAny(
      "All categories",
      TICKET_CATEGORIES.map((c) => ({ value: c, label: TICKET_CATEGORY_LABELS[c] })),
    ),
  },
  {
    key: "priority",
    label: "Priority",
    options: withAny(
      "All priorities",
      TICKET_PRIORITIES.map((p) => ({ value: p, label: TICKET_PRIORITY_LABELS[p] })),
    ),
  },
  {
    key: "assignee",
    label: "Assignee",
    options: withAny(
      "Anyone",
      (Object.keys(QUEUE_ASSIGNEE_LABELS) as QueueAssignee[]).map((a) => ({
        value: a,
        label: QUEUE_ASSIGNEE_LABELS[a],
      })),
    ),
  },
];

/** Date range inputs; each one bounds the other so "from" can't be after "to". */
export const QUEUE_DATE_FILTERS: {
  key: "from" | "to";
  label: string;
  /** Which sibling value constrains this input, and how. */
  bound: { attr: "min" | "max"; key: "from" | "to" };
}[] = [
  { key: "from", label: "From", bound: { attr: "max", key: "to" } },
  { key: "to", label: "To", bound: { attr: "min", key: "from" } },
];

/** One-click status presets shown before the individual status chips. */
export const QUEUE_STATUS_PRESETS: { label: string; status: readonly TicketStatus[] }[] = [
  { label: "Unresolved", status: DEFAULT_QUEUE_STATUS },
  { label: "All", status: [] }, // empty = every status
];

/** Query fields that count as "filtered" (sort and page don't). */
export const QUEUE_FILTER_FIELDS = [
  "category",
  "priority",
  "assignee",
  "from",
  "to",
] as const satisfies readonly (keyof AdminQueueQuery)[];
