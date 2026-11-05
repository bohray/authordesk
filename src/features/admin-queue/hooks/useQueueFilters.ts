"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  defaultQueueSort,
  queueAssigneeFilters,
  queueSorts,
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/shared/constants/ticket";
import { allStatusesParam, defaultQueueStatus, queueFilterFields } from "@/constants/queue";
import type { AdminQueueQuery, QueueAssignee, QueueSort } from "@/types/queue";

const defaultStatus: TicketStatus[] = [...defaultQueueStatus];
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export function parseQueueQuery(sp: URLSearchParams | { get(name: string): string | null }): AdminQueueQuery {
  const rawStatus = sp.get("status");
  const status =
    rawStatus === null
      ? defaultStatus
      : rawStatus === allStatusesParam
        ? []
        : rawStatus
            .split(",")
            .filter((s): s is TicketStatus => (ticketStatuses as readonly string[]).includes(s));
  const page = Number.parseInt(sp.get("page") ?? "1", 10);
  const from = sp.get("from");
  const to = sp.get("to");
  return {
    status: rawStatus !== null && rawStatus !== allStatusesParam && status.length === 0 ? defaultStatus : status,
    category: oneOf<TicketCategory>(sp.get("category"), ticketCategories),
    priority: oneOf<TicketPriority>(sp.get("priority"), ticketPriorities),
    assignee: oneOf<QueueAssignee>(sp.get("assignee"), queueAssigneeFilters),
    from: from && dateRe.test(from) ? from : null,
    to: to && dateRe.test(to) ? to : null,
    q: sp.get("q") ?? "",
    sort: oneOf<QueueSort>(sp.get("sort"), queueSorts) ?? defaultQueueSort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function serializeQueueQuery(q: AdminQueueQuery): string {
  const sp = new URLSearchParams();
  if (q.status.length === 0) sp.set("status", allStatusesParam);
  else if (!sameSet(q.status, defaultStatus)) sp.set("status", q.status.join(","));
  if (q.category) sp.set("category", q.category);
  if (q.priority) sp.set("priority", q.priority);
  if (q.assignee) sp.set("assignee", q.assignee);
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.q.trim()) sp.set("q", q.q.trim());
  if (q.sort !== defaultQueueSort) sp.set("sort", q.sort);
  if (q.page > 1) sp.set("page", String(q.page));
  return sp.toString();
}

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
    !sameSet(query.status, defaultStatus) ||
    !!query.q.trim() ||
    queueFilterFields.some((field) => query[field] !== null);

  return { query, setFilters, reset, isFiltered };
}
