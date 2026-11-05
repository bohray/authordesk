"use client";

import dynamic from "next/dynamic";
import { FileText, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConversationThread } from "@/components/common/ConversationThread";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { uiMessages } from "@/constants/messages";
import { formatBytes, formatDateTime } from "@/lib/format";
import { isNotFoundError } from "@/lib/apiClient";
import { useAdminTicket } from "@/features/admin-ticket/hooks/useAdminTicket";
import { BackToQueueLink } from "@/features/admin-ticket/components/BackToQueueLink";
import { TicketHeader } from "@/features/admin-ticket/components/TicketHeader";
import { DraftReplyPanel } from "@/features/admin-ticket/components/DraftReplyPanel";
import { ClassificationCard } from "@/features/admin-ticket/components/ClassificationCard";
import { AuthorContextCard, BookDetailsCard } from "@/features/admin-ticket/components/ContextCards";
import {
  AdminTicketSkeleton,
  NotesSkeleton,
  TimelineSkeleton,
} from "@/features/admin-ticket/components/AdminTicketSkeletons";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

// Side-panel widgets are below the fold on most screens and pull in extra code (the notes
// form brings react-hook-form + its resolver), so they load in separate chunks. The thread,
// header and draft panel stay in the main bundle because they're the critical path.
const InternalNotes = dynamic(
  () => import("@/features/admin-ticket/components/InternalNotes").then((m) => m.InternalNotes),
  { loading: () => <NotesSkeleton /> },
);
const ActivityTimeline = dynamic(
  () => import("@/features/admin-ticket/components/ActivityTimeline").then((m) => m.ActivityTimeline),
  { loading: () => <TimelineSkeleton /> },
);

/** The author's original message and attachment name (uploads aren't stored yet). */
function OriginalQueryCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  return (
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
  );
}

function ConversationSection({ messages }: { messages: AdminTicketDetailDTO["messages"] }) {
  return (
    <section aria-labelledby="admin-conversation-heading" className="space-y-3">
      <h2 id="admin-conversation-heading" className="text-sm font-medium text-muted-foreground">
        Conversation ({messages.length})
      </h2>
      <ConversationThread
        messages={messages}
        viewerRole="ADMIN"
        showAiAssisted
        emptyText="No replies yet. The author is waiting for a first response."
      />
    </section>
  );
}

export function AdminTicketView({ ticketId }: { ticketId: string }) {
  const { data: ticket, isPending, isError, error, refetch, isRefetching } = useAdminTicket(ticketId);

  if (isPending) return <AdminTicketSkeleton />;
  if (isError) {
    const notFound = isNotFoundError(error);
    return (
      <div className="space-y-3">
        <BackToQueueLink />
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
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <TicketHeader ticket={ticket} />

        <OriginalQueryCard ticket={ticket} />
        <ConversationSection messages={ticket.messages} />
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
