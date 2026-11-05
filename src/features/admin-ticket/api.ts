import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/constants/routes";
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
    apiClient.get<AdminTicketDetailDTO>(API_ROUTES.admin.ticket(id), undefined, signal),
  update: (id: string, patch: AdminTicketPatch) =>
    apiClient.patch<AdminTicketDetailDTO>(API_ROUTES.admin.ticket(id), patch),
  reply: (id: string, body: string, aiAssisted: boolean) =>
    apiClient.post<AdminTicketDetailDTO>(API_ROUTES.admin.ticketMessages(id), { body, aiAssisted }),
  addNote: (id: string, body: string) =>
    apiClient.post<TicketNoteDTO>(API_ROUTES.admin.ticketNotes(id), { body }),
  draft: (id: string, signal?: AbortSignal) =>
    apiClient.get<DraftDTO>(API_ROUTES.admin.ticketDraft(id), undefined, signal),
  regenerateDraft: (id: string) => apiClient.post<DraftDTO>(API_ROUTES.admin.ticketDraftRegenerate(id)),
  retryAi: (id: string) => apiClient.post<AdminTicketDetailDTO>(API_ROUTES.admin.ticketAiRetry(id)),
  /** Current admin (to tell "assigned to me" apart). Shares the session cache key. */
  me: (signal?: AbortSignal) => apiClient.get<SessionUserDTO>(API_ROUTES.auth.me, undefined, signal),
};
