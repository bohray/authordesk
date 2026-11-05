import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api-client";

/** Don't retry client errors (4xx); retry transient failures once. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false, // live updates handle freshness
      },
      mutations: {
        retry: false,
      },
    },
  });
}
