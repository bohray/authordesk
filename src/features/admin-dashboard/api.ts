import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/constants/routes";
import type { AdminStatsDTO } from "@/shared/types/dto";

export const dashboardApi = {
  stats: (signal?: AbortSignal) =>
    apiClient.get<AdminStatsDTO>(API_ROUTES.admin.stats, undefined, signal),
};
