"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/constants/query-keys";
import { AI_PENDING_REFETCH_MS } from "@/constants/ui";
import { getErrorMessage } from "@/lib/api-client";
import { adminTicketApi, type AdminTicketPatch } from "@/features/admin-ticket/api";
import type { AdminTicketDetailDTO, DraftDTO } from "@/shared/types/dto";

export function useAdminTicket(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.adminTickets.detail(ticketId),
    queryFn: ({ signal }) => adminTicketApi.get(ticketId, signal),
    refetchInterval: (q) => (q.state.data?.aiStatus === "PENDING" ? AI_PENDING_REFETCH_MS : false),
  });
}

export function useCurrentAdmin() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => adminTicketApi.me(signal),
    staleTime: 5 * 60_000,
  });
}

/** Writes the fresh detail into the cache and refreshes queue + stats. */
function useSyncTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return (ticket?: AdminTicketDetailDTO) => {
    if (ticket) queryClient.setQueryData(queryKeys.adminTickets.detail(ticketId), ticket);
    else void queryClient.invalidateQueries({ queryKey: queryKeys.adminTickets.detail(ticketId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminTickets.lists() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminStats });
  };
}

export function useUpdateTicket(ticketId: string) {
  const sync = useSyncTicket(ticketId);
  return useMutation({
    mutationFn: ({ patch }: { patch: AdminTicketPatch; successMessage?: string }) =>
      adminTicketApi.update(ticketId, patch),
    onSuccess: (ticket, vars) => {
      sync(ticket);
      toast.success(vars.successMessage ?? "Ticket updated");
    },
    onError: (err) => {
      sync();
      toast.error(getErrorMessage(err, "Couldn't update the ticket"));
    },
  });
}

export function useSendReply(ticketId: string) {
  const sync = useSyncTicket(ticketId);
  return useMutation({
    mutationFn: ({ body, aiAssisted }: { body: string; aiAssisted: boolean }) =>
      adminTicketApi.reply(ticketId, body, aiAssisted),
    onSuccess: (ticket) => {
      sync(ticket);
      toast.success("Reply sent to the author");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't send the reply")),
  });
}

export function useAddNote(ticketId: string) {
  const sync = useSyncTicket(ticketId);
  return useMutation({
    mutationFn: (body: string) => adminTicketApi.addNote(ticketId, body),
    onSuccess: () => {
      sync();
      toast.success("Internal note added");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't add the note")),
  });
}

export function useRetryAi(ticketId: string) {
  const sync = useSyncTicket(ticketId);
  return useMutation({
    mutationFn: () => adminTicketApi.retryAi(ticketId),
    onSuccess: (ticket) => {
      sync(ticket);
      if (ticket.aiStatus === "FAILED") toast.warning("AI is still unavailable. Rule-based values kept.");
      else toast.success(ticket.aiStatus === "PENDING" ? "AI classification queued" : "AI classification updated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "AI retry failed")),
  });
}

/** AI draft: generated on first open (can take a few seconds), cached server-side afterwards. */
export function useDraft(ticketId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.adminTickets.draft(ticketId),
    queryFn: ({ signal }) => adminTicketApi.draft(ticketId, signal),
    enabled,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

export function useRegenerateDraft(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminTicketApi.regenerateDraft(ticketId),
    onSuccess: (draft: DraftDTO) => {
      queryClient.setQueryData(queryKeys.adminTickets.draft(ticketId), draft);
      if (draft.status === "UNAVAILABLE") toast.warning(draft.message ?? "AI drafting is unavailable");
      else toast.success("Fresh draft generated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't regenerate the draft")),
  });
}
