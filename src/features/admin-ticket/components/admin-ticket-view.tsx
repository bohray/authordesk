"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Paperclip } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationThread } from "@/components/common/conversation-thread";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { DetailSkeleton } from "@/components/common/loading-state";
import { ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { formatBytes, formatDateTime } from "@/lib/format";
import { isApiError } from "@/lib/api-client";
import { useAdminTicket } from "@/features/admin-ticket/hooks/use-admin-ticket";
import { TicketHeader } from "@/features/admin-ticket/components/ticket-header";
import { DraftReplyPanel } from "@/features/admin-ticket/components/draft-reply-panel";
import { ClassificationCard } from "@/features/admin-ticket/components/classification-card";
import { AuthorContextCard, BookDetailsCard } from "@/features/admin-ticket/components/context-cards";
import { InternalNotes } from "@/features/admin-ticket/components/internal-notes";
import { ActivityTimeline } from "@/features/admin-ticket/components/activity-timeline";

export function AdminTicketView({ ticketId }: { ticketId: string }) {
  const { data: ticket, isPending, isError, error, refetch, isRefetching } = useAdminTicket(ticketId);

  if (isPending) return <DetailSkeleton />;
  if (isError) {
    const notFound = isApiError(error) && [400, 404, 422].includes(error.status);
    return (
      <div className="space-y-3">
        <Link
          href={ROUTES.admin.tickets}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
        >
          <ArrowLeft aria-hidden />
          Queue
        </Link>
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
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <TicketHeader ticket={ticket} />

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Original query · {formatDateTime(ticket.createdAt)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{ticket.description}</p>
            {ticket.attachment && (
              <p className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
                <Paperclip className="size-3.5" aria-hidden />
                {ticket.attachment.name}
                <span className="text-muted-foreground">({formatBytes(ticket.attachment.size)})</span>
                <span className="text-muted-foreground">· file not uploaded</span>
              </p>
            )}
          </CardContent>
        </Card>

        <section aria-labelledby="admin-conversation-heading" className="space-y-3">
          <h2 id="admin-conversation-heading" className="text-sm font-medium text-muted-foreground">
            Conversation ({ticket.messages.length})
          </h2>
          <ConversationThread
            messages={ticket.messages}
            viewerRole="ADMIN"
            showAiAssisted
            emptyText="No replies yet. The author is waiting for a first response."
          />
        </section>

        <DraftReplyPanel ticket={ticket} />
      </div>

      <aside className="min-w-0 space-y-4">
        <ClassificationCard ticket={ticket} />
        <InternalNotes ticketId={ticket.id} notes={ticket.notes} />
        <AuthorContextCard ticket={ticket} />
        <BookDetailsCard ticket={ticket} />
        <ActivityTimeline events={ticket.events} />
      </aside>
    </div>
  );
}
