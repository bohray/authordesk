"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { UpdatingIndicator } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { queueEmptyCopy } from "@/constants/queue";
import { useQueueFilters } from "@/features/admin-queue/hooks/useQueueFilters";
import { useAdminTickets, usePrefetchAdminTicket } from "@/features/admin-queue/hooks/useAdminQueue";
import { QueueFilters } from "@/features/admin-queue/components/QueueFilters";
import { QueuePageHeader } from "@/features/admin-queue/components/QueuePageHeader";
import { QueueTableSkeleton } from "@/features/admin-queue/components/QueueSkeletons";
import { QueueStatsStrip } from "@/features/admin-queue/components/QueueStatsStrip";
import { QueueTable } from "@/features/admin-queue/components/QueueTable";

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
  const handlePageChange = (page: number) => setFilters({ page });
  const emptyCopy = isFiltered ? queueEmptyCopy.filtered : queueEmptyCopy.unfiltered;

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
          title={emptyCopy.title}
          description={emptyCopy.description}
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
            onPageChange={handlePageChange}
          />
        </>
      )}
    </>
  );
}
