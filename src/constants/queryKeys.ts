import type { AdminQueueQuery } from "@/types/queue";

/**
 * Single source of truth for TanStack Query keys.
 * Keys are hierarchical so `invalidateQueries({ queryKey: x.all })` hits every child.
 */
export const queryKeys = {
  session: ["session"] as const,
  books: {
    all: ["books"] as const,
    mine: () => ["books", "mine"] as const,
  },
  authorTickets: {
    all: ["author-tickets"] as const,
    lists: () => ["author-tickets", "list"] as const,
    list: (page: number, limit: number) => ["author-tickets", "list", { page, limit }] as const,
    detail: (ticketId: string) => ["author-tickets", "detail", ticketId] as const,
  },
  adminTickets: {
    all: ["admin-tickets"] as const,
    lists: () => ["admin-tickets", "list"] as const,
    list: (query: AdminQueueQuery) => ["admin-tickets", "list", query] as const,
    detail: (ticketId: string) => ["admin-tickets", "detail", ticketId] as const,
    draft: (ticketId: string) => ["admin-tickets", "draft", ticketId] as const,
  },
  adminStats: ["admin-stats"] as const,
} as const;
