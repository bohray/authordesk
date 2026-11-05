"use client";

import { useCallback } from "react";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { queryStaleMs } from "@/lib/queryClient";
import { authorTicketsApi } from "@/features/tickets/api";
import type { CreateTicketInput } from "@/shared/schemas/ticket.schema";

export function useMyTickets(page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.authorTickets.list(page, limit),
    queryFn: ({ signal }) => authorTicketsApi.list(page, limit, signal),
    placeholderData: keepPreviousData,
  });
}

const ticketQuery = (ticketId: string) =>
  queryOptions({
    queryKey: queryKeys.authorTickets.detail(ticketId),
    queryFn: ({ signal }) => authorTicketsApi.get(ticketId, signal),
  });

export function useMyTicket(ticketId: string) {
  return useQuery(ticketQuery(ticketId));
}

/** Warms a ticket's detail on hover/focus so opening it renders instantly. */
export function usePrefetchMyTicket() {
  const queryClient = useQueryClient();
  return useCallback(
    (ticketId: string) => void queryClient.prefetchQuery(ticketQuery(ticketId)),
    [queryClient],
  );
}

export function useBookOptions() {
  return useQuery({
    queryKey: queryKeys.books.mine(),
    queryFn: ({ signal }) => authorTicketsApi.books(signal),
    staleTime: queryStaleMs.long,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => authorTicketsApi.create(input),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.authorTickets.detail(ticket.id), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.authorTickets.lists() });
    },
  });
}

export function useReplyToTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => authorTicketsApi.reply(ticketId, body),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.authorTickets.detail(ticketId), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.authorTickets.lists() });
    },
    onError: () => {
      // e.g. 409 when the ticket was closed meanwhile: show the latest state.
      void queryClient.invalidateQueries({ queryKey: queryKeys.authorTickets.detail(ticketId) });
    },
  });
}
