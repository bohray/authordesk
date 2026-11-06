import { filterControlClass, queueStatusViews } from "@/constants/queue";
import { sameSet } from "@/features/admin-queue/hooks/useQueueFilters";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/shared/constants/ticket";

/**
 * Single-choice status switch: exactly one view is highlighted, replacing the old preset +
 * per-status chips that could show three "active" pills at once.
 */
export function StatusSwitch({
  status,
  onChange,
}: {
  status: readonly TicketStatus[];
  onChange: (status: TicketStatus[]) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Status"
      className={cn("inline-flex shrink-0 items-center rounded-lg border bg-muted/60 p-0.5", filterControlClass)}
    >
      {queueStatusViews.map((view) => {
        const active = sameSet(status, view.status);
        return (
          <button
            key={view.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange([...view.status])}
            className={cn(
              "h-full rounded-md px-3 text-xs font-medium whitespace-nowrap interactive focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
