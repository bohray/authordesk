"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/query-keys";
import { adminQueueApi } from "@/features/admin-queue/api";
import type { AdminQueueQuery } from "@/types/queue";

export function useAdminTickets(query: AdminQueueQuery) {
  return useQuery({
    queryKey: queryKeys.adminTickets.list(query),
    queryFn: ({ signal }) => adminQueueApi.list(query, signal),
    placeholderData: keepPreviousData,
    // Keep "Classifying…" rows moving even if a live update is missed.
    refetchInterval: (q) =>
      q.state.data?.data.some((t) => t.aiStatus === "PENDING") ? 4000 : false,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: ({ signal }) => adminQueueApi.stats(signal),
  });
}
