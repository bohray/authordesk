import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion, TableSkeleton } from "@/components/common/skeletons";
import { QueuePageHeader } from "@/features/admin-queue/components/queue-page-header";
import { QUEUE_COLUMNS, QUEUE_SKELETON_ROWS } from "@/features/admin-queue/components/queue-layout";

/** "Open" tile + 4 priority chips + "Unassigned" chip, same height as the real strip. */
const STATS_CHIPS = 6;

export function QueueStatsSkeleton() {
  return (
    <div className="mb-4 flex gap-2 overflow-hidden pb-1" aria-hidden>
      {Array.from({ length: STATS_CHIPS }, (_, i) => (
        <Skeleton key={i} className="h-[3.75rem] min-w-24 flex-1 rounded-lg" />
      ))}
    </div>
  );
}

export function QueueFiltersSkeleton() {
  return (
    <div className="mb-4 space-y-3 rounded-xl border bg-background p-3" aria-hidden>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 sm:w-52" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 xl:min-w-36" />
        ))}
      </div>
    </div>
  );
}

export function QueueTableSkeleton() {
  return (
    <TableSkeleton
      columns={QUEUE_COLUMNS}
      rows={QUEUE_SKELETON_ROWS}
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
