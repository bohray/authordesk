"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConversationThread } from "@/components/common/ConversationThread";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { RelativeTime } from "@/components/common/RelativeTime";
import { StatusBadge } from "@/components/common/StatusBadge";
import { routes } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { ticketStatusHints } from "@/constants/tickets";
import { bookLabel, formatBytes, formatDateTime } from "@/lib/format";
import { isNotFoundError } from "@/lib/apiClient";
import { useMyTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { ReplyForm } from "@/features/tickets/components/ReplyForm";
import { TicketDetailSkeleton } from "@/features/tickets/components/TicketSkeletons";
import type { TicketStatus } from "@/shared/constants/ticket";
import type { AuthorTicketDTO } from "@/shared/types/dto";

const statusHintIcons = {
  OPEN: Hourglass,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle2,
  CLOSED: Lock,
} satisfies Record<TicketStatus, LucideIcon>;

function BackLink() {
  return (
    <Link
      href={routes.author.tickets}
      className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 mb-3" })}
    >
      <ArrowLeft aria-hidden />
      My Tickets
    </Link>
  );
}

/** What happens next for this status, shown under the title. */
function StatusHint({ status }: { status: TicketStatus }) {
  const Icon = statusHintIcons[status];
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      {ticketStatusHints[status]}
    </p>
  );
}

function OriginalQueryCard({ ticket }: { ticket: AuthorTicketDTO }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Your original query</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{ticket.description}</p>
        {ticket.attachment && (
          <p className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
            <FileText className="size-3.5" aria-hidden />
            {ticket.attachment.name}
            <span className="text-muted-foreground">({formatBytes(ticket.attachment.size)})</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const { data: ticket, isPending, isError, error, refetch, isRefetching } = useMyTicket(ticketId);

  if (isPending) return <TicketDetailSkeleton />;
  if (isError) {
    const notFound = isNotFoundError(error);
    return (
      <>
        <BackLink />
        {notFound ? (
          <EmptyState
            icon={FileText}
            title={uiMessages.tickets.notFoundTitle}
            description={uiMessages.tickets.notFoundBody}
          />
        ) : (
          <ErrorState
            title="Couldn't load this ticket"
            error={error}
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        )}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <header className="mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{ticket.ticketNumber}</span>
          <StatusBadge status={ticket.status} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight break-words">{ticket.subject}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden />
            {bookLabel(ticket.book)}
          </span>
          <span aria-hidden>·</span>
          <span title={formatDateTime(ticket.createdAt)}>
            Opened <RelativeTime date={ticket.createdAt} />
          </span>
        </p>
        <StatusHint status={ticket.status} />
      </header>

      <div className="space-y-5">
        <OriginalQueryCard ticket={ticket} />

        <section aria-labelledby="conversation-heading" className="space-y-3">
          <h2 id="conversation-heading" className="text-sm font-medium text-muted-foreground">
            Conversation
          </h2>
          <ConversationThread
            messages={ticket.messages}
            viewerRole="AUTHOR"
            emptyText="No replies yet. You'll see our team's response here without refreshing."
          />
        </section>

        <Card size="sm">
          <CardContent>
            <ReplyForm ticketId={ticket.id} status={ticket.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
