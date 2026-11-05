"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/loading-state";
import { Pagination } from "@/components/common/pagination";
import { MESSAGES } from "@/constants/messages";
import { useQueueFilters } from "@/features/admin-queue/hooks/use-queue-filters";
import { useAdminTickets } from "@/features/admin-queue/hooks/use-admin-queue";
import { QueueFilters } from "@/features/admin-queue/components/queue-filters";
import { QueueStatsStrip } from "@/features/admin-queue/components/queue-stats-strip";
import { QueueTable } from "@/features/admin-queue/components/queue-table";

export function TicketQueue() {
  const { query, setFilters, reset, isFiltered } = useQueueFilters();
  const [resetKey, setResetKey] = useState(0);
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } =
    useAdminTickets(query);

  const handleReset = () => {
    setResetKey((k) => k + 1);
    reset();
  };

  return (
    <>
      <PageHeader
        title="Ticket Queue"
        description="Unresolved tickets first, highest priority and oldest at the top."
      />
      <QueueStatsStrip query={query} onFilter={setFilters} />
      <QueueFilters
        query={query}
        onChange={setFilters}
        onReset={handleReset}
        isFiltered={isFiltered}
        resetKey={resetKey}
      />
      {isPending ? (
        <ListSkeleton rows={8} />
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
          <QueueTable tickets={data.data} isFetching={isPlaceholderData && isFetching} />
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
