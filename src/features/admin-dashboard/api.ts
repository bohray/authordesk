import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import type { AdminStatsDTO } from "@/shared/types/dto";

export const dashboardApi = {
  stats: (signal?: AbortSignal) =>
    apiClient.get<AdminStatsDTO>(apiRoutes.admin.stats, undefined, signal),
};
