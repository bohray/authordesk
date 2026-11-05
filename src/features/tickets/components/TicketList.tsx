"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, LifeBuoy, MessageSquareReply, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { UpdatingIndicator } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { RelativeTime } from "@/components/common/RelativeTime";
import { StatusBadge } from "@/components/common/StatusBadge";
import { routes } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { authorTicketsPageSize } from "@/constants/ui";
import { bookLabel, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMyTickets, usePrefetchMyTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { TicketsPageHeader } from "@/features/tickets/components/TicketsPageHeader";
import { TicketListSkeleton } from "@/features/tickets/components/TicketSkeletons";
import { unresolvedStatuses } from "@/shared/constants/ticket";
import type { AuthorTicketDTO } from "@/shared/types/dto";
import type { AuthorTicketTab } from "@/types/queue";

const tabs: { value: AuthorTicketTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

const previewChars = 180;

const emptyTabText: Record<Exclude<AuthorTicketTab, "all">, string> = {
  open: "You have no open tickets. Everything has been answered.",
  resolved: "No resolved tickets yet.",
};

/** Buckets the page once (single pass) so tab counts and the visible list are O(1) lookups. */
function groupByTab(tickets: AuthorTicketDTO[]): Record<AuthorTicketTab, AuthorTicketDTO[]> {
  const groups: Record<AuthorTicketTab, AuthorTicketDTO[]> = { all: tickets, open: [], resolved: [] };
  for (const t of tickets) {
    groups[unresolvedStatuses.includes(t.status) ? "open" : "resolved"].push(t);
  }
  return groups;
}

function TicketRow({
  ticket,
  onPrefetch,
}: {
  ticket: AuthorTicketDTO;
  onPrefetch: (ticketId: string) => void;
}) {
  const last = ticket.messages.at(-1);
  const hasNewReply = last?.senderRole === "ADMIN" && unresolvedStatuses.includes(ticket.status);
  const lastActivity = last?.createdAt ?? ticket.createdAt;
  return (
    <li>
      <Link
        href={routes.author.ticket(ticket.id)}
        onMouseEnter={() => onPrefetch(ticket.id)}
        onFocus={() => onPrefetch(ticket.id)}
        className={cn(
          "block rounded-xl border bg-background p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          hasNewReply && "border-l-4 border-l-primary",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{ticket.ticketNumber}</span>
          <StatusBadge status={ticket.status} />
          {last?.senderRole === "ADMIN" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
              <MessageSquareReply className="size-3" aria-hidden />
              New reply
            </span>
          )}
          <span className="ml-auto">
            Updated <RelativeTime date={lastActivity} />
          </span>
        </div>
        <h3 className="mt-1.5 font-medium">{ticket.subject}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="size-3" aria-hidden />
          {bookLabel(ticket.book)}
          <span aria-hidden>·</span>
          Opened <RelativeTime date={ticket.createdAt} />
        </p>
        {last && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {last.senderRole === "ADMIN" ? `${last.senderName}: ` : "You: "}
            </span>
            {truncate(last.body, previewChars)}
          </p>
        )}
      </Link>
    </li>
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
            <Tabs value={tab} onValueChange={(v) => setTab(v as AuthorTicketTab)}>
              <TabsList aria-label="Filter tickets">
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="px-3">
                    {t.label}
                    <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums">
                      {groups[t.value].length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
