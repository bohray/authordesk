"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/constants/queryKeys";
import { aiPendingRefetchMs } from "@/constants/ui";
import { getErrorMessage } from "@/lib/apiClient";
import { queryGcMs, queryStaleMs } from "@/lib/queryClient";
import { adminTicketApi, type AdminTicketPatch } from "@/features/admin-ticket/api";
import type {
  AdminTicketDetailDTO,
  AdminTicketListItemDTO,
  DraftDTO,
  Paginated,
  SessionUserDTO,
} from "@/shared/types/dto";

export function useAdminTicket(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.adminTickets.detail(ticketId),
    queryFn: ({ signal }) => adminTicketApi.get(ticketId, signal),
    refetchInterval: (q) => (q.state.data?.aiStatus === "PENDING" ? aiPendingRefetchMs : false),
  });
}

export function useCurrentAdmin() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => adminTicketApi.me(signal),
    staleTime: queryStaleMs.long,
  });
}

/**
 * Applies a PATCH locally, mirroring the server rules: overrides mark the source as ADMIN,
 * "me" assigns the current admin. Works for both the detail and a queue row.
 */
function applyPatch<T extends AdminTicketListItemDTO>(
  ticket: T,
  patch: AdminTicketPatch,
  me: SessionUserDTO | undefined,
): T {
  const next = { ...ticket };
  if (patch.status) next.status = patch.status;
  if (patch.category) Object.assign(next, { category: patch.category, categorySource: "ADMIN" });
  if (patch.priority) Object.assign(next, { priority: patch.priority, prioritySource: "ADMIN" });
  if (patch.assigneeId === null) next.assignee = null;
  else if (patch.assigneeId === "me" && me) next.assignee = { id: me.id, name: me.name };
  return next;
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

/**
 * Status / assignee / category / priority changes are optimistic: the detail and any cached
 * queue rows update instantly, roll back on error, and are reconciled with the server
 * response (detail) plus a targeted refetch of lists and stats.
 */
export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.adminTickets.detail(ticketId);
  const listsKey = queryKeys.adminTickets.lists();

  return useMutation({
    mutationFn: ({ patch }: { patch: AdminTicketPatch; successMessage?: string }) =>
      adminTicketApi.update(ticketId, patch),
    onMutate: async ({ patch }) => {
      // Stop in-flight refetches from overwriting the optimistic value.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: listsKey }),
      ]);
      const me = queryClient.getQueryData<SessionUserDTO>(queryKeys.session);
      const previousDetail = queryClient.getQueryData<AdminTicketDetailDTO>(detailKey);
      const previousLists = queryClient.getQueriesData<Paginated<AdminTicketListItemDTO>>({
        queryKey: listsKey,
      });

      if (previousDetail) queryClient.setQueryData(detailKey, applyPatch(previousDetail, patch, me));
      queryClient.setQueriesData<Paginated<AdminTicketListItemDTO>>({ queryKey: listsKey }, (old) =>
        old
          ? { ...old, data: old.data.map((t) => (t.id === ticketId ? applyPatch(t, patch, me) : t)) }
          : old,
      );
      return { previousDetail, previousLists };
    },
    onSuccess: (ticket, vars) => {
      queryClient.setQueryData(detailKey, ticket);
      toast.success(vars.successMessage ?? "Ticket updated");
    },
    onError: (err, _vars, snapshot) => {
      if (snapshot?.previousDetail) queryClient.setQueryData(detailKey, snapshot.previousDetail);
      for (const [key, data] of snapshot?.previousLists ?? []) queryClient.setQueryData(key, data);
      void queryClient.invalidateQueries({ queryKey: detailKey });
      toast.error(getErrorMessage(err, "Couldn't update the ticket"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listsKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminStats });
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
    // Drafts are cached server-side and only change on regenerate (handled via setQueryData).
    staleTime: Infinity,
    gcTime: queryGcMs,
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
