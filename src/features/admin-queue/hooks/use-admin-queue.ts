"use client";

import { useCallback } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/query-keys";
import { AI_PENDING_REFETCH_MS } from "@/constants/ui";
import { adminQueueApi } from "@/features/admin-queue/api";
import type { AdminQueueQuery } from "@/types/queue";

export function useAdminTickets(query: AdminQueueQuery) {
  return useQuery({
    queryKey: queryKeys.adminTickets.list(query),
    queryFn: ({ signal }) => adminQueueApi.list(query, signal),
    // Keep the current rows on screen while filters/pages change (no skeleton flash).
    placeholderData: keepPreviousData,
    // Keep "Classifying…" rows moving even if a live update is missed. TanStack pauses this
    // while the tab is hidden (refetchIntervalInBackground defaults to false).
    refetchInterval: (q) =>
      q.state.data?.data.some((t) => t.aiStatus === "PENDING") ? AI_PENDING_REFETCH_MS : false,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: ({ signal }) => adminQueueApi.stats(signal),
  });
}

/** Warms a ticket's detail on row hover/focus so opening it renders without a skeleton. */
export function usePrefetchAdminTicket() {
  const queryClient = useQueryClient();
  return useCallback(
    (ticketId: string) =>
      void queryClient.prefetchQuery({
        queryKey: queryKeys.adminTickets.detail(ticketId),
        queryFn: ({ signal }) => adminQueueApi.detail(ticketId, signal),
      }),
    [queryClient],
  );
}
