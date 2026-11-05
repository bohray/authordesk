"use client";

import { RotateCw, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toneText } from "@/components/common/tones";
import { priorityDotClasses } from "@/constants/ui";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminStats } from "@/features/admin-queue/hooks/useAdminQueue";
import { QueueStatsSkeleton } from "@/features/admin-queue/components/QueueSkeletons";
import {
  ticketPriorities,
  ticketPriorityLabels,
  type TicketPriority,
} from "@/shared/constants/ticket";
import type { AdminQueueQuery } from "@/types/queue";

/** Open-ticket counts at a glance; each chip doubles as a quick filter. */
export function QueueStatsStrip({
  query,
  onFilter,
}: {
  query: AdminQueueQuery;
  onFilter: (patch: Partial<AdminQueueQuery>) => void;
}) {
  const { data, isPending, isError, refetch, isRefetching } = useAdminStats();

  if (isPending) return <QueueStatsSkeleton />;
  if (isError) {
    // Secondary widget: a compact retry instead of a full error card above the queue.
    return (
      <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" role="alert">
        Couldn&apos;t load the open-ticket counts.
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RotateCw className={cn(isRefetching && "animate-spin")} aria-hidden />
          Retry
        </Button>
      </p>
    );
  }

  const totalOpen =
    ticketPriorities.reduce((s, p) => s + (data.openByPriority[p] ?? 0), 0) +
    (data.openByPriority.UNCLASSIFIED ?? 0);

  const chip = (active: boolean) =>
    cn(
      "flex min-w-24 flex-1 flex-col items-start gap-0.5 rounded-lg border bg-background px-3 py-2 text-left interactive pressable hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      active && "border-primary/50 bg-muted/60",
    );

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Open tickets summary">
      <div className="flex min-w-24 flex-col justify-center rounded-lg bg-primary px-3 py-2 text-primary-foreground">
        <span className="text-xs opacity-80">Open</span>
        <span className="text-lg leading-tight font-semibold tabular-nums">{formatNumber(totalOpen)}</span>
      </div>
      {ticketPriorities.map((p: TicketPriority) => {
        const active = query.priority === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            className={chip(active)}
            onClick={() => onFilter({ priority: active ? null : p })}
            title={active ? "Clear priority filter" : `Show ${ticketPriorityLabels[p].toLowerCase()} priority`}
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", priorityDotClasses[p])} aria-hidden />
              {ticketPriorityLabels[p]}
            </span>
            <span className="text-lg leading-tight font-semibold tabular-nums">
              {formatNumber(data.openByPriority[p] ?? 0)}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={query.assignee === "unassigned"}
        className={chip(query.assignee === "unassigned")}
        onClick={() => onFilter({ assignee: query.assignee === "unassigned" ? null : "unassigned" })}
        title="Show unassigned tickets"
      >
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserX className="size-3" aria-hidden />
          Unassigned
        </span>
        <span
          className={cn(
            "text-lg leading-tight font-semibold tabular-nums",
            data.unassigned > 0 && toneText.attention,
          )}
        >
          {formatNumber(data.unassigned)}
        </span>
      </button>
    </div>
  );
}
