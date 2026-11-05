import Link from "next/link";
import { BookOpen, MessageSquareReply } from "lucide-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import { StatusBadge } from "@/components/common/StatusBadge";
import { routes } from "@/constants/routes";
import { ticketPreviewChars } from "@/constants/tickets";
import { bookLabel, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { unresolvedStatuses } from "@/shared/constants/ticket";
import type { AuthorTicketDTO } from "@/shared/types/dto";

/** One ticket in the author's list: status, last activity and a preview of the latest message. */
export function TicketRow({
  ticket,
  onPrefetch,
}: {
  ticket: AuthorTicketDTO;
  onPrefetch: (ticketId: string) => void;
}) {
  const last = ticket.messages.at(-1);
  const lastFromSupport = last?.senderRole === "ADMIN";
  // Only highlight the row while the reply still needs the author's attention.
  const hasNewReply = lastFromSupport && unresolvedStatuses.includes(ticket.status);
  const lastActivity = last?.createdAt ?? ticket.createdAt;
  const handlePrefetch = () => onPrefetch(ticket.id);
  return (
    <li>
      <Link
        href={routes.author.ticket(ticket.id)}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        className={cn(
          "block rounded-xl border bg-background p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          hasNewReply && "border-l-4 border-l-primary",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{ticket.ticketNumber}</span>
          <StatusBadge status={ticket.status} />
          {lastFromSupport && (
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
              {lastFromSupport ? `${last.senderName}: ` : "You: "}
            </span>
            {truncate(last.body, ticketPreviewChars)}
          </p>
        )}
      </Link>
    </li>
  );
}
