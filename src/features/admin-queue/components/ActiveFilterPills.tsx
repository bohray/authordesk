import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ActiveFilter } from "@/features/admin-queue/utils/activeFilters";
import type { AdminQueueQuery } from "@/types/queue";

/** What's narrowing the queue, each removable on its own, plus "Clear all". */
export function ActiveFilterPills({
  filters,
  onRemove,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onRemove: (clear: Partial<AdminQueueQuery>) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex h-7 items-center gap-1 rounded-full border bg-muted/60 pr-1 pl-3 text-xs font-medium"
        >
          {filter.label}
          <button
            type="button"
            onClick={() => onRemove(filter.clear)}
            aria-label={`Remove filter: ${filter.label}`}
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground interactive hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <Button variant="link" size="sm" onClick={onClearAll} className="h-7 px-2">
        Clear all
      </Button>
    </div>
  );
}
