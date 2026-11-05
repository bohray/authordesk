import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/constants/routes";
import { PAGE_SIZE } from "@/constants/ui";
import type { AdminStatsDTO, AdminTicketListItemDTO } from "@/shared/types/dto";
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
    limit: PAGE_SIZE,
  };
}

export const adminQueueApi = {
  list: (query: AdminQueueQuery, signal?: AbortSignal) =>
    apiClient.getPaginated<AdminTicketListItemDTO>(
      API_ROUTES.admin.tickets,
      toQueueParams(query),
      signal,
    ),
  stats: (signal?: AbortSignal) =>
    apiClient.get<AdminStatsDTO>(API_ROUTES.admin.stats, undefined, signal),
};
