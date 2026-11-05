import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api-client";

/**
 * Cache timings shared by every query hook, so freshness rules live in one place.
 * Ticket data is kept fresh by the live-updates poller (targeted invalidation), not by
 * short stale times, which is why the default can be relatively long.
 */
export const QUERY_STALE_MS = {
  /** Default for ticket lists/details: the poller invalidates them when they change. */
  default: 30_000,
  /** Data that rarely changes during a session (books, current user). */
  long: 5 * 60_000,
} as const;

/** How long unused query data stays cached, e.g. so "back" to the queue is instant. */
export const QUERY_GC_MS = 10 * 60_000;

/** Don't retry client errors (4xx); retry transient failures once. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_MS.default,
        gcTime: QUERY_GC_MS,
        retry: shouldRetry,
        // The live-updates hook polls immediately when the tab becomes visible again,
        // so a focus refetch here would double every request on tab switch.
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
