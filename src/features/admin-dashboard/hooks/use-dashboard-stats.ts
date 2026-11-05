"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/query-keys";
import { dashboardApi } from "@/features/admin-dashboard/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: ({ signal }) => dashboardApi.stats(signal),
  });
}
