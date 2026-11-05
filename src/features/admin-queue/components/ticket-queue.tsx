"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { UpdatingIndicator } from "@/components/common/loading-state";
import { Pagination } from "@/components/common/pagination";
import { MESSAGES } from "@/constants/messages";
import { useQueueFilters } from "@/features/admin-queue/hooks/use-queue-filters";
import { useAdminTickets, usePrefetchAdminTicket } from "@/features/admin-queue/hooks/use-admin-queue";
import { QueueFilters } from "@/features/admin-queue/components/queue-filters";
import { QueuePageHeader } from "@/features/admin-queue/components/queue-page-header";
import { QueueTableSkeleton } from "@/features/admin-queue/components/queue-skeletons";
import { QueueStatsStrip } from "@/features/admin-queue/components/queue-stats-strip";
import { QueueTable } from "@/features/admin-queue/components/queue-table";

export function TicketQueue() {
  const { query, setFilters, reset, isFiltered } = useQueueFilters();
  const [resetKey, setResetKey] = useState(0);
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } =
    useAdminTickets(query);
  const prefetch = usePrefetchAdminTicket();
  // Only true while showing the previous filter's rows; background polls don't dim the table.
  const isUpdating = isPlaceholderData && isFetching;

  const handleReset = () => {
    setResetKey((k) => k + 1);
    reset();
  };

  return (
    <>
      <QueuePageHeader />
      <QueueStatsStrip query={query} onFilter={setFilters} />
      <QueueFilters
        query={query}
        onChange={setFilters}
        onReset={handleReset}
        isFiltered={isFiltered}
        resetKey={resetKey}
      />
      {isPending ? (
        <QueueTableSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load the queue"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={isFiltered ? MESSAGES.queue.emptyBody : MESSAGES.queue.emptyTitle}
          description={
            isFiltered
              ? "Try widening the filters or clearing the search."
              : "No unresolved tickets right now. New tickets will appear here automatically."
          }
          action={
            isFiltered ? (
              <Button variant="outline" onClick={handleReset}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-1 flex h-5 justify-end">
            <UpdatingIndicator active={isUpdating} />
          </div>
          <QueueTable tickets={data.data} isFetching={isUpdating} onPrefetch={prefetch} />
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPageChange={(page) => setFilters({ page })}
          />
        </>
      )}
    </>
  );
}
