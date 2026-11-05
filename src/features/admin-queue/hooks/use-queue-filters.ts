"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  UNRESOLVED_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/shared/constants/ticket";
import type { AdminQueueQuery, QueueAssignee, QueueSort } from "@/types/queue";

const ALL = "ALL";
const DEFAULT_STATUS: TicketStatus[] = [...UNRESOLVED_STATUSES];
const SORTS: QueueSort[] = ["urgency", "newest", "oldest"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export function parseQueueQuery(sp: URLSearchParams | { get(name: string): string | null }): AdminQueueQuery {
  const rawStatus = sp.get("status");
  const status =
    rawStatus === null
      ? DEFAULT_STATUS
      : rawStatus === ALL
        ? []
        : rawStatus
            .split(",")
            .filter((s): s is TicketStatus => (TICKET_STATUSES as readonly string[]).includes(s));
  const page = Number.parseInt(sp.get("page") ?? "1", 10);
  const from = sp.get("from");
  const to = sp.get("to");
  return {
    status: rawStatus !== null && rawStatus !== ALL && status.length === 0 ? DEFAULT_STATUS : status,
    category: oneOf<TicketCategory>(sp.get("category"), TICKET_CATEGORIES),
    priority: oneOf<TicketPriority>(sp.get("priority"), TICKET_PRIORITIES),
    assignee: oneOf<QueueAssignee>(sp.get("assignee"), ["me", "unassigned"]),
    from: from && DATE_RE.test(from) ? from : null,
    to: to && DATE_RE.test(to) ? to : null,
    q: sp.get("q") ?? "",
    sort: oneOf<QueueSort>(sp.get("sort"), SORTS) ?? "urgency",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function serializeQueueQuery(q: AdminQueueQuery): string {
  const sp = new URLSearchParams();
  if (q.status.length === 0) sp.set("status", ALL);
  else if (!sameSet(q.status, DEFAULT_STATUS)) sp.set("status", q.status.join(","));
  if (q.category) sp.set("category", q.category);
  if (q.priority) sp.set("priority", q.priority);
  if (q.assignee) sp.set("assignee", q.assignee);
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.q.trim()) sp.set("q", q.q.trim());
  if (q.sort !== "urgency") sp.set("sort", q.sort);
  if (q.page > 1) sp.set("page", String(q.page));
  return sp.toString();
}

export const DEFAULT_QUEUE_STATUS = DEFAULT_STATUS;

/** Queue filters live in the URL so views are shareable and survive refresh/back. */
export function useQueueFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = useMemo(() => parseQueueQuery(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: AdminQueueQuery) => {
      const qs = serializeQueueQuery(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  /** Any filter change resets to page 1 unless a page is given explicitly. */
  const setFilters = useCallback(
    (patch: Partial<AdminQueueQuery>) => navigate({ ...query, page: 1, ...patch }),
    [navigate, query],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  const isFiltered =
    !sameSet(query.status, DEFAULT_STATUS) ||
    !!query.category ||
    !!query.priority ||
    !!query.assignee ||
    !!query.from ||
    !!query.to ||
    !!query.q.trim();

  return { query, setFilters, reset, isFiltered };
}
