"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, LifeBuoy, MessageSquareReply, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/loading-state";
import { Pagination } from "@/components/common/pagination";
import { RelativeTime } from "@/components/common/relative-time";
import { StatusBadge } from "@/components/common/status-badge";
import { ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { AUTHOR_TICKETS_PAGE_SIZE } from "@/constants/ui";
import { truncate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMyTickets } from "@/features/tickets/hooks/use-author-tickets";
import { UNRESOLVED_STATUSES } from "@/shared/constants/ticket";
import type { AuthorTicketDTO } from "@/shared/types/dto";
import type { AuthorTicketTab } from "@/types/queue";

const TABS: { value: AuthorTicketTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

function matchesTab(t: AuthorTicketDTO, tab: AuthorTicketTab) {
  if (tab === "all") return true;
  const open = UNRESOLVED_STATUSES.includes(t.status);
  return tab === "open" ? open : !open;
}

function TicketRow({ ticket }: { ticket: AuthorTicketDTO }) {
  const last = ticket.messages.at(-1);
  const hasNewReply = last?.senderRole === "ADMIN" && UNRESOLVED_STATUSES.includes(ticket.status);
  const lastActivity = last?.createdAt ?? ticket.createdAt;
  return (
    <li>
      <Link
        href={ROUTES.author.ticket(ticket.id)}
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
          {ticket.book?.title ?? "General / Account"}
          <span aria-hidden>·</span>
          Opened <RelativeTime date={ticket.createdAt} />
        </p>
        {last && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {last.senderRole === "ADMIN" ? `${last.senderName}: ` : "You: "}
            </span>
            {truncate(last.body, 180)}
          </p>
        )}
      </Link>
    </li>
  );
}

export function TicketList() {
  const [tab, setTab] = useState<AuthorTicketTab>("all");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isRefetching } = useMyTickets(
    page,
    AUTHOR_TICKETS_PAGE_SIZE,
  );

  const header = (
    <PageHeader
      title="My Tickets"
      description="Your support conversations. Replies from our team appear here automatically."
      actions={
        <Link href={ROUTES.author.newTicket()} className={buttonVariants()}>
          <Plus aria-hidden />
          New Ticket
        </Link>
      }
    />
  );

  if (isPending) {
    return (
      <>
        {header}
        <ListSkeleton rows={4} />
      </>
    );
  }
  if (isError) {
    return (
      <>
        {header}
        <ErrorState
          title="Couldn't load your tickets"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </>
    );
  }

  const tickets = data.data;
  if (data.meta.total === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={LifeBuoy}
          title={MESSAGES.tickets.emptyTitle}
          description={MESSAGES.tickets.emptyBody}
          action={
            <Link href={ROUTES.author.newTicket()} className={buttonVariants()}>
              <Plus aria-hidden />
              Raise your first ticket
            </Link>
          }
        />
      </>
    );
  }

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => matchesTab(t, "open")).length,
    resolved: tickets.filter((t) => matchesTab(t, "resolved")).length,
  };
  const visible = tickets.filter((t) => matchesTab(t, tab));

  return (
    <>
      {header}
      <Tabs value={tab} onValueChange={(v) => setTab(v as AuthorTicketTab)} className="mb-4">
        <TabsList aria-label="Filter tickets">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-3">
              {t.label}
              <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums">
                {counts[t.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <EmptyState
          title={MESSAGES.tickets.emptyFilteredTitle}
          description={
            tab === "open"
              ? "You have no open tickets. Everything has been answered."
              : "No resolved tickets yet."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((t) => (
            <TicketRow key={t.id} ticket={t} />
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
  );
}
