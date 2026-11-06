"use client";

import type { ReactNode } from "react";
import { RotateCw, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toneText } from "@/components/common/tones";
import { queueAssigneeLabels } from "@/constants/queue";
import { priorityDotClasses } from "@/constants/ui";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminStats } from "@/features/admin-queue/hooks/useAdminQueue";
import { QueueStatsSkeleton } from "@/features/admin-queue/components/QueueSkeletons";
import { ticketPriorities, ticketPriorityLabels } from "@/shared/constants/ticket";
import type { AdminQueueQuery } from "@/types/queue";

const statValueClass = "text-lg leading-tight font-semibold tabular-nums";

/** Count chip that toggles a queue filter; `aria-pressed` reflects whether that filter is on. */
function StatsChip({
  active,
  onClick,
  title,
  icon,
  label,
  value,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex min-w-28 flex-1 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left interactive pressable focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        // One selected style for every card, so "which filter is on" is never ambiguous.
        active
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "bg-background hover:border-primary/30 hover:bg-muted/50",
      )}
      onClick={onClick}
      title={title}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn(statValueClass, value === 0 && "text-muted-foreground")}>
        {formatNumber(value)}
      </span>
    </button>
  );
}

/** Open-ticket counts per priority + unassigned. Each card is the filter for that value (click again to clear). */
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

  const unassignedActive = query.assignee === "unassigned";

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Open tickets summary">
      {ticketPriorities.map((p) => {
        const active = query.priority === p;
        const label = ticketPriorityLabels[p];
        return (
          <StatsChip
            key={p}
            active={active}
            onClick={() => onFilter({ priority: active ? null : p })}
            title={active ? `Clear ${label.toLowerCase()} priority filter` : `Show ${label.toLowerCase()} priority`}
            icon={<span className={cn("size-2 rounded-full", priorityDotClasses[p])} aria-hidden />}
            label={label}
            value={data.openByPriority[p] ?? 0}
          />
        );
      })}
      <StatsChip
        active={unassignedActive}
        onClick={() => onFilter({ assignee: unassignedActive ? null : "unassigned" })}
        title={unassignedActive ? "Clear unassigned filter" : "Show unassigned tickets"}
        // Amber icon (not a loud number) flags work without an owner, so it doesn't outshout Critical.
        icon={<UserX className={cn("size-3", data.unassigned > 0 && toneText.warn)} aria-hidden />}
        label={queueAssigneeLabels.unassigned}
        value={data.unassigned}
      />
    </div>
  );
}
