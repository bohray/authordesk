import { defaultQueueStatus, queueAssigneeLabels, queueStatusViews } from "@/constants/queue";
import { sameSet } from "@/features/admin-queue/hooks/useQueueFilters";
import { describeDateRange } from "@/features/admin-queue/utils/dateRange";
import { ticketCategoryLabels, ticketPriorityLabels, ticketStatusLabels } from "@/shared/constants/ticket";
import type { AdminQueueQuery } from "@/types/queue";

export interface ActiveFilter {
  key: string;
  label: string;
  /** Patch that removes just this filter. */
  clear: Partial<AdminQueueQuery>;
}

/**
 * Removable pills for every filter that narrows the queue. Status only gets a pill when it
 * isn't one of the switch's views (e.g. a dashboard deep link to "Open" alone), so a choice
 * is never hidden. Search isn't a pill: the search box itself shows it.
 */
export function getActiveFilters(query: AdminQueueQuery): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (!queueStatusViews.some((view) => sameSet(query.status, view.status))) {
    filters.push({
      key: "status",
      label: `Status: ${query.status.map((s) => ticketStatusLabels[s]).join(", ")}`,
      clear: { status: [...defaultQueueStatus] },
    });
  }
  if (query.priority) {
    filters.push({
      key: "priority",
      label: `Priority: ${ticketPriorityLabels[query.priority]}`,
      clear: { priority: null },
    });
  }
  if (query.category) {
    filters.push({
      key: "category",
      label: `Category: ${ticketCategoryLabels[query.category]}`,
      clear: { category: null },
    });
  }
  if (query.assignee) {
    filters.push({
      key: "assignee",
      label: queueAssigneeLabels[query.assignee],
      clear: { assignee: null },
    });
  }
  if (query.from || query.to) {
    filters.push({
      key: "date",
      label: `Created: ${describeDateRange(query.from, query.to)}`,
      clear: { from: null, to: null },
    });
  }
  return filters;
}
