"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { queryStaleMs } from "@/lib/queryClient";
import { booksApi } from "@/features/books/api";

export function useMyBooks() {
  return useQuery({
    queryKey: queryKeys.books.mine(),
    queryFn: ({ signal }) => booksApi.getMyBooks(signal),
    staleTime: queryStaleMs.long,
  });
}
