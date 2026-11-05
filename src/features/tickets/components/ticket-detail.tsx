"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, FileText, Hourglass, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationThread } from "@/components/common/conversation-thread";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { RelativeTime } from "@/components/common/relative-time";
import { StatusBadge } from "@/components/common/status-badge";
import { ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { bookLabel, formatBytes, formatDateTime } from "@/lib/format";
import { isNotFoundError } from "@/lib/api-client";
import { useMyTicket } from "@/features/tickets/hooks/use-author-tickets";
import { ReplyForm } from "@/features/tickets/components/reply-form";
import { TicketDetailSkeleton } from "@/features/tickets/components/ticket-skeletons";
import type { TicketStatus } from "@/shared/constants/ticket";

const STATUS_HINT: Record<TicketStatus, { icon: typeof Clock; text: string }> = {
  OPEN: { icon: Hourglass, text: "We've received your ticket. A member of our team will reply here." },
  IN_PROGRESS: { icon: Clock, text: "Our team is working on this. New replies appear here automatically." },
  RESOLVED: { icon: CheckCircle2, text: "Marked resolved. Reply below if you still need help." },
  CLOSED: { icon: Lock, text: "This ticket is closed." },
};

function BackLink() {
  return (
    <Link
      href={ROUTES.author.tickets}
      className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 mb-3" })}
    >
      <ArrowLeft aria-hidden />
      My Tickets
    </Link>
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
            title={MESSAGES.tickets.notFoundTitle}
            description={MESSAGES.tickets.notFoundBody}
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

  const hint = STATUS_HINT[ticket.status];
  const HintIcon = hint.icon;

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
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <HintIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          {hint.text}
        </p>
      </header>

      <div className="space-y-5">
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
