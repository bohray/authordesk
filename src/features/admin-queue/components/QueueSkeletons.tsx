import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingRegion, TableSkeleton } from "@/components/common/Skeletons";
import { QueuePageHeader } from "@/features/admin-queue/components/QueuePageHeader";
import {
  filterControlClass,
  queueColumns,
  queueSelectFilters,
  queueSkeletonRows,
} from "@/constants/queue";
import { ticketPriorities } from "@/shared/constants/ticket";

/** One card per priority + "Unassigned", same height as the real strip. */
const statsChips = ticketPriorities.length + 1;
/** Select filters + the Created-date dropdown. */
const filterControls = queueSelectFilters.length + 1;

export function QueueStatsSkeleton() {
  return (
    <div className="mb-4 flex gap-2 overflow-hidden pb-1" aria-hidden>
      {Array.from({ length: statsChips }, (_, i) => (
        <Skeleton key={i} className="h-[3.75rem] min-w-28 flex-1 rounded-lg" />
      ))}
    </div>
  );
}

export function QueueFiltersSkeleton() {
  return (
    <div className="mb-4 space-y-3 rounded-xl border bg-background p-3" aria-hidden>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className={`${filterControlClass} min-w-0 flex-1 basis-64`} />
        <Skeleton className={`${filterControlClass} w-72 rounded-lg`} />
        <Skeleton className={`${filterControlClass} w-48`} />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: filterControls }, (_, i) => (
          <Skeleton key={i} className={`${filterControlClass} min-w-40 flex-1 sm:w-48 sm:flex-none`} />
        ))}
      </div>
    </div>
  );
}

export function QueueTableSkeleton() {
  return (
    <TableSkeleton
      columns={queueColumns}
      rows={queueSkeletonRows}
      rowClassName="h-[4.25rem]"
      label="Loading tickets"
    />
  );
}

/** Whole queue page for `loading.tsx` / the useSearchParams Suspense fallback. */
export function QueuePageSkeleton() {
  return (
    <LoadingRegion label="Loading the queue">
      <QueuePageHeader />
      <QueueStatsSkeleton />
      <QueueFiltersSkeleton />
      <QueueTableSkeleton />
    </LoadingRegion>
  );
}
