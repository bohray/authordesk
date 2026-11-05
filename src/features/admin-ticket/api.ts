import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/shared/constants/ticket";
import type {
  AdminTicketDetailDTO,
  DraftDTO,
  SessionUserDTO,
  TicketNoteDTO,
} from "@/shared/types/dto";

export interface AdminTicketPatch {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigneeId?: "me" | null;
}

export const adminTicketApi = {
  get: (id: string, signal?: AbortSignal) =>
    apiClient.get<AdminTicketDetailDTO>(apiRoutes.admin.ticket(id), undefined, signal),
  update: (id: string, patch: AdminTicketPatch) =>
    apiClient.patch<AdminTicketDetailDTO>(apiRoutes.admin.ticket(id), patch),
  reply: (id: string, body: string, aiAssisted: boolean) =>
    apiClient.post<AdminTicketDetailDTO>(apiRoutes.admin.ticketMessages(id), { body, aiAssisted }),
  addNote: (id: string, body: string) =>
    apiClient.post<TicketNoteDTO>(apiRoutes.admin.ticketNotes(id), { body }),
  draft: (id: string, signal?: AbortSignal) =>
    apiClient.get<DraftDTO>(apiRoutes.admin.ticketDraft(id), undefined, signal),
  regenerateDraft: (id: string) => apiClient.post<DraftDTO>(apiRoutes.admin.ticketDraftRegenerate(id)),
  retryAi: (id: string) => apiClient.post<AdminTicketDetailDTO>(apiRoutes.admin.ticketAiRetry(id)),
  /** Current admin (to tell "assigned to me" apart). Shares the session cache key. */
  me: (signal?: AbortSignal) => apiClient.get<SessionUserDTO>(apiRoutes.auth.me, undefined, signal),
};
