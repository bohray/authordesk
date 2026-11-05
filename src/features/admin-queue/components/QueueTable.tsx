"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { AgeBadge } from "@/components/common/AgeBadge";
import { AiSourceBadge } from "@/components/common/AiSourceBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Spinner } from "@/components/common/LoadingState";
import { toneText } from "@/components/common/tones";
import { classifyingLabel } from "@/constants/adminTicket";
import { generalBookLabel, queueAssigneeLabels, queueColumns } from "@/constants/queue";
import { routes } from "@/constants/routes";
import { priorityRowClasses } from "@/constants/ui";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { unresolvedStatuses } from "@/shared/constants/ticket";
import type { AdminTicketListItemDTO } from "@/shared/types/dto";

/** Clicks on these inside a row keep their own behaviour instead of opening the ticket. */
const rowClickExclusions = "a,button";

function PriorityCell({ ticket }: { ticket: AdminTicketListItemDTO }) {
  return (
    <span className="inline-flex items-center gap-1">
      <PriorityBadge priority={ticket.priority} />
      {ticket.prioritySource === "ADMIN" && <AiSourceBadge source="ADMIN" />}
    </span>
  );
}

function TicketCell({ ticket, href }: { ticket: AdminTicketListItemDTO; href: string }) {
  return (
    <>
      <Link href={href} className="group block focus-visible:outline-none">
        <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
        <span className="line-clamp-2 font-medium text-foreground group-hover:underline group-focus-visible:underline">
          {ticket.subject}
        </span>
      </Link>
      {ticket.messageCount > 0 && (
        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3" aria-hidden />
          {plural(ticket.messageCount, "message")}
        </span>
      )}
    </>
  );
}

function AssigneeCell({ assignee }: { assignee: AdminTicketListItemDTO["assignee"] }) {
  if (assignee) return <span className="text-sm text-foreground">{assignee.name}</span>;
  return (
    <span className={cn("text-xs font-medium", toneText.attention)}>{queueAssigneeLabels.unassigned}</span>
  );
}

function AiCell({ ticket }: { ticket: AdminTicketListItemDTO }) {
  if (ticket.aiStatus === "PENDING") return <Spinner label={classifyingLabel} className="text-xs" />;
  return (
    <span className="inline-flex items-center gap-1">
      <AiSourceBadge source={ticket.categorySource} />
      {ticket.aiStatus === "FAILED" && (
        <span title="AI classification failed, rule-based fallback used">
          <AlertTriangle className={cn("size-3.5", toneText.warn)} aria-label="AI failed" />
        </span>
      )}
    </span>
  );
}

function QueueRow({
  ticket,
  onPrefetch,
}: {
  ticket: AdminTicketListItemDTO;
  onPrefetch?: (ticketId: string) => void;
}) {
  const router = useRouter();
  const unresolved = unresolvedStatuses.includes(ticket.status);
  const emphasis = unresolved && ticket.priority ? priorityRowClasses[ticket.priority] : undefined;
  const href = routes.admin.ticket(ticket.id);

  // The whole row is a click target for mouse users; the subject link stays the keyboard path.
  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (e.target instanceof Element && e.target.closest(rowClickExclusions)) return;
    router.push(href);
  };
  const handlePrefetch = onPrefetch && (() => onPrefetch(ticket.id));

  return (
    <TableRow
      className={cn("cursor-pointer", emphasis, !unresolved && "text-muted-foreground")}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
    >
      <TableCell className="pl-4">
        <PriorityCell ticket={ticket} />
      </TableCell>
      <TableCell className="max-w-80 min-w-56 whitespace-normal">
        <TicketCell ticket={ticket} href={href} />
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">{ticket.author.name}</div>
        <div className="max-w-44 truncate text-xs text-muted-foreground">{ticket.author.email}</div>
      </TableCell>
      <TableCell className="max-w-44">
        <span className="block truncate" title={ticket.book?.title}>
          {ticket.book?.title ?? <span className="text-muted-foreground">{generalBookLabel}</span>}
        </span>
      </TableCell>
      <TableCell>
        <CategoryBadge category={ticket.category} />
      </TableCell>
      <TableCell>
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell>
        <AssigneeCell assignee={ticket.assignee} />
      </TableCell>
      <TableCell>
        <AgeBadge createdAt={ticket.createdAt} status={ticket.status} />
      </TableCell>
      <TableCell className="pr-4">
        <AiCell ticket={ticket} />
      </TableCell>
    </TableRow>
  );
}

export function QueueTable({
  tickets,
  isFetching,
  onPrefetch,
}: {
  tickets: AdminTicketListItemDTO[];
  /** True while previous rows are shown and the next page/filter is loading. */
  isFetching?: boolean;
  /** Called on row hover/focus to warm the detail query. */
  onPrefetch?: (ticketId: string) => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background transition-opacity",
        isFetching && "opacity-70",
      )}
      aria-busy={isFetching || undefined}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {queueColumns.map((label, i) => (
              <TableHead
                key={label}
                className={cn(i === 0 && "pl-4", i === queueColumns.length - 1 && "pr-4")}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <QueueRow key={ticket.id} ticket={ticket} onPrefetch={onPrefetch} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
