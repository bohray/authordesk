import type { Role } from "@/shared/constants/roles";

/** Page routes (frontend navigation). */
export const routes = {
  home: "/",
  login: "/login",
  author: {
    books: "/author/books",
    tickets: "/author/tickets",
    newTicket: (bookId?: string) =>
      bookId ? `/author/tickets/new?bookId=${encodeURIComponent(bookId)}` : "/author/tickets/new",
    ticket: (ticketId: string) => `/author/tickets/${ticketId}`,
  },
  admin: {
    tickets: "/admin/tickets",
    ticket: (ticketId: string) => `/admin/tickets/${ticketId}`,
    dashboard: "/admin/dashboard",
  },
} as const;

export function homeForRole(role: Role): string {
  return role === "ADMIN" ? routes.admin.tickets : routes.author.books;
}

/** REST API paths, relative to apiBase. */
export const apiBase = "/api/v1";

export const apiRoutes = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  me: {
    books: "/me/books",
    tickets: "/me/tickets",
    ticket: (id: string) => `/me/tickets/${id}`,
    ticketMessages: (id: string) => `/me/tickets/${id}/messages`,
  },
  admin: {
    tickets: "/admin/tickets",
    ticket: (id: string) => `/admin/tickets/${id}`,
    ticketMessages: (id: string) => `/admin/tickets/${id}/messages`,
    ticketNotes: (id: string) => `/admin/tickets/${id}/notes`,
    ticketDraft: (id: string) => `/admin/tickets/${id}/draft`,
    ticketDraftRegenerate: (id: string) => `/admin/tickets/${id}/draft/regenerate`,
    ticketAiRetry: (id: string) => `/admin/tickets/${id}/ai/retry`,
    stats: "/admin/stats",
  },
  updates: "/updates",
} as const;
