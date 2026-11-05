import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import { pageSize } from "@/constants/ui";
import type {
  AdminStatsDTO,
  AdminTicketDetailDTO,
  AdminTicketListItemDTO,
} from "@/shared/types/dto";
import type { AdminQueueQuery } from "@/types/queue";

/** Converts UI filters to the GET /admin/tickets query string contract. */
export function toQueueParams(q: AdminQueueQuery) {
  return {
    status: q.status.length > 0 ? q.status.join(",") : undefined,
    category: q.category ?? undefined,
    priority: q.priority ?? undefined,
    assignee: q.assignee ?? undefined,
    from: q.from ?? undefined,
    to: q.to ?? undefined,
    q: q.q.trim() || undefined,
    sort: q.sort,
    page: q.page,
    limit: pageSize,
  };
}

export const adminQueueApi = {
  list: (query: AdminQueueQuery, signal?: AbortSignal) =>
    apiClient.getPaginated<AdminTicketListItemDTO>(
      apiRoutes.admin.tickets,
      toQueueParams(query),
      signal,
    ),
  stats: (signal?: AbortSignal) =>
    apiClient.get<AdminStatsDTO>(apiRoutes.admin.stats, undefined, signal),
  /** Ticket detail, used only to prefetch on row hover (shares the detail cache key). */
  detail: (id: string, signal?: AbortSignal) =>
    apiClient.get<AdminTicketDetailDTO>(apiRoutes.admin.ticket(id), undefined, signal),
};
