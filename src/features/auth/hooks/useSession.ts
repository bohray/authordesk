"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { queryStaleMs } from "@/lib/queryClient";
import { authApi } from "@/features/auth/api";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => authApi.me(signal),
    staleTime: queryStaleMs.long,
  });
}
