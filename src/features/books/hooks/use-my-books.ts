"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/query-keys";
import { QUERY_STALE_MS } from "@/lib/query-client";
import { booksApi } from "@/features/books/api";

export function useMyBooks() {
  return useQuery({
    queryKey: queryKeys.books.mine(),
    queryFn: ({ signal }) => booksApi.getMyBooks(signal),
    staleTime: QUERY_STALE_MS.long,
  });
}
