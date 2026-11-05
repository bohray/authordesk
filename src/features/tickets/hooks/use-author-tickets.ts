"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/query-keys";
import { authorTicketsApi } from "@/features/tickets/api";
import type { CreateTicketInput } from "@/shared/schemas/ticket.schema";

export function useMyTickets(page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.authorTickets.list(page, limit),
    queryFn: ({ signal }) => authorTicketsApi.list(page, limit, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMyTicket(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.authorTickets.detail(ticketId),
    queryFn: ({ signal }) => authorTicketsApi.get(ticketId, signal),
  });
}

export function useBookOptions() {
  return useQuery({
    queryKey: queryKeys.books.mine(),
    queryFn: ({ signal }) => authorTicketsApi.books(signal),
    staleTime: 5 * 60_000,
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
