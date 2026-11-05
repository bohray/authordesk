import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/constants/routes";
import type { CreateTicketInput } from "@/shared/schemas/ticket.schema";
import type { AuthorTicketDTO, MyBooksDTO } from "@/shared/types/dto";

export const authorTicketsApi = {
  list: (page: number, limit: number, signal?: AbortSignal) =>
    apiClient.getPaginated<AuthorTicketDTO>(API_ROUTES.me.tickets, { page, limit }, signal),
  get: (ticketId: string, signal?: AbortSignal) =>
    apiClient.get<AuthorTicketDTO>(API_ROUTES.me.ticket(ticketId), undefined, signal),
  create: (input: CreateTicketInput) =>
    apiClient.post<AuthorTicketDTO>(API_ROUTES.me.tickets, input),
  reply: (ticketId: string, body: string) =>
    apiClient.post<AuthorTicketDTO>(API_ROUTES.me.ticketMessages(ticketId), { body }),
  /** Book list for the "which book" dropdown (shares the books cache key). */
  books: (signal?: AbortSignal) => apiClient.get<MyBooksDTO>(API_ROUTES.me.books, undefined, signal),
};
