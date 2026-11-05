import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingRegion, TableSkeleton } from "@/components/common/Skeletons";
import { QueuePageHeader } from "@/features/admin-queue/components/QueuePageHeader";
import {
  filterControlClass,
  queueColumns,
  queueDateFilters,
  queueSelectFilters,
  queueSkeletonRows,
  queueStatusPresets,
} from "@/constants/queue";
import { ticketPriorities, ticketStatuses } from "@/shared/constants/ticket";

/** "Open" tile + one chip per priority + "Unassigned" chip, same height as the real strip. */
const statsChips = ticketPriorities.length + 2;
/** "Status" label + presets + one chip per status. */
const statusChips = 1 + queueStatusPresets.length + ticketStatuses.length;
/** Select filters + date inputs + the Clear button. */
const filterControls = queueSelectFilters.length + queueDateFilters.length + 1;

export function QueueStatsSkeleton() {
  return (
    <div className="mb-4 flex gap-2 overflow-hidden pb-1" aria-hidden>
      {Array.from({ length: statsChips }, (_, i) => (
        <Skeleton key={i} className="h-[3.75rem] min-w-24 flex-1 rounded-lg" />
      ))}
    </div>
  );
}

export function QueueFiltersSkeleton() {
  return (
    <div className="mb-4 space-y-3 rounded-xl border bg-background p-3" aria-hidden>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className={`${filterControlClass} flex-1`} />
        <Skeleton className={`${filterControlClass} sm:w-52`} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: statusChips }, (_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
        {Array.from({ length: filterControls }, (_, i) => (
          <Skeleton key={i} className={`${filterControlClass} xl:min-w-36`} />
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
