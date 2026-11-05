import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import type { CreateTicketInput } from "@/shared/schemas/ticket.schema";
import type { AuthorTicketDTO, MyBooksDTO } from "@/shared/types/dto";

export const authorTicketsApi = {
  list: (page: number, limit: number, signal?: AbortSignal) =>
    apiClient.getPaginated<AuthorTicketDTO>(apiRoutes.me.tickets, { page, limit }, signal),
  get: (ticketId: string, signal?: AbortSignal) =>
    apiClient.get<AuthorTicketDTO>(apiRoutes.me.ticket(ticketId), undefined, signal),
  create: (input: CreateTicketInput) =>
    apiClient.post<AuthorTicketDTO>(apiRoutes.me.tickets, input),
  reply: (ticketId: string, body: string) =>
    apiClient.post<AuthorTicketDTO>(apiRoutes.me.ticketMessages(ticketId), { body }),
  /** Book list for the "which book" dropdown (shares the books cache key). */
  books: (signal?: AbortSignal) => apiClient.get<MyBooksDTO>(apiRoutes.me.books, undefined, signal),
};
