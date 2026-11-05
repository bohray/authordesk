"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { UpdatingIndicator } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { routes } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { authorTicketsPageSize } from "@/constants/ui";
import {
  authorTicketTabLabels,
  authorTicketTabs,
  emptyTabText,
  isAuthorTicketTab,
} from "@/constants/tickets";
import { useMyTickets, usePrefetchMyTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { TicketRow } from "@/features/tickets/components/TicketRow";
import { TicketsPageHeader } from "@/features/tickets/components/TicketsPageHeader";
import { TicketListSkeleton } from "@/features/tickets/components/TicketSkeletons";
import { unresolvedStatuses } from "@/shared/constants/ticket";
import type { AuthorTicketDTO } from "@/shared/types/dto";
import type { AuthorTicketTab } from "@/types/queue";

/** Buckets the page once (single pass) so tab counts and the visible list are O(1) lookups. */
function groupByTab(tickets: AuthorTicketDTO[]): Record<AuthorTicketTab, AuthorTicketDTO[]> {
  const groups: Record<AuthorTicketTab, AuthorTicketDTO[]> = { all: tickets, open: [], resolved: [] };
  for (const t of tickets) {
    groups[unresolvedStatuses.includes(t.status) ? "open" : "resolved"].push(t);
  }
  return groups;
}

function TicketTabs({
  value,
  onChange,
  groups,
}: {
  value: AuthorTicketTab;
  onChange: (tab: AuthorTicketTab) => void;
  groups: Record<AuthorTicketTab, AuthorTicketDTO[]>;
}) {
  const handleValueChange = (next: unknown) => {
    if (isAuthorTicketTab(next)) onChange(next);
  };
  return (
    <Tabs value={value} onValueChange={handleValueChange}>
      <TabsList aria-label="Filter tickets">
        {authorTicketTabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="px-3">
            {authorTicketTabLabels[tab]}
            <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums">
              {groups[tab].length}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function TicketList() {
  const [tab, setTab] = useState<AuthorTicketTab>("all");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } =
    useMyTickets(page, authorTicketsPageSize);
  const prefetch = usePrefetchMyTicket();
  const groups = useMemo(() => groupByTab(data?.data ?? []), [data]);

  return (
    <>
      <TicketsPageHeader />
      {isPending ? (
        <TicketListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your tickets"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      ) : data.meta.total === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={uiMessages.tickets.emptyTitle}
          description={uiMessages.tickets.emptyBody}
          action={
            <Link href={routes.author.newTicket()} className={buttonVariants()}>
              <Plus aria-hidden />
              Raise your first ticket
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <TicketTabs value={tab} onChange={setTab} groups={groups} />
            <UpdatingIndicator active={isPlaceholderData && isFetching} />
          </div>
          {tab !== "all" && groups[tab].length === 0 ? (
            <EmptyState title={uiMessages.tickets.emptyFilteredTitle} description={emptyTabText[tab]} />
          ) : (
            <ul className="space-y-3">
              {groups[tab].map((t) => (
                <TicketRow key={t.id} ticket={t} onPrefetch={prefetch} />
              ))}
            </ul>
          )}
          {data.meta.totalPages > 1 && (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={data.meta.limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </>
  );
}
