"use client";

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
} from "@/components/ui/table";
import { AgeBadge } from "@/components/common/age-badge";
import { AiSourceBadge } from "@/components/common/ai-source-badge";
import { CategoryBadge } from "@/components/common/category-badge";
import { PriorityBadge } from "@/components/common/priority-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Spinner } from "@/components/common/loading-state";
import { ROUTES } from "@/constants/routes";
import { PRIORITY_ROW_CLASSES } from "@/constants/ui";
import { cn } from "@/lib/utils";
import { UNRESOLVED_STATUSES } from "@/shared/constants/ticket";
import type { AdminTicketListItemDTO } from "@/shared/types/dto";

function AiCell({ t }: { t: AdminTicketListItemDTO }) {
  if (t.aiStatus === "PENDING") return <Spinner label="Classifying…" className="text-xs" />;
  return (
    <span className="inline-flex items-center gap-1">
      <AiSourceBadge source={t.categorySource} />
      {t.aiStatus === "FAILED" && (
        <span title="AI classification failed, rule-based fallback used">
          <AlertTriangle className="size-3.5 text-amber-600" aria-label="AI failed" />
        </span>
      )}
    </span>
  );
}

export function QueueTable({
  tickets,
  isFetching,
}: {
  tickets: AdminTicketListItemDTO[];
  isFetching?: boolean;
}) {
  const router = useRouter();
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background transition-opacity",
        isFetching && "opacity-70",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Priority</TableHead>
            <TableHead>Ticket</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Book</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="pr-4">AI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => {
            const unresolved = UNRESOLVED_STATUSES.includes(t.status);
            const emphasis = unresolved && t.priority ? PRIORITY_ROW_CLASSES[t.priority] : undefined;
            const href = ROUTES.admin.ticket(t.id);
            return (
              <TableRow
                key={t.id}
                className={cn("cursor-pointer", emphasis, !unresolved && "text-muted-foreground")}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,button")) return;
                  router.push(href);
                }}
              >
                <TableCell className="pl-4">
                  <span className="inline-flex items-center gap-1">
                    <PriorityBadge priority={t.priority} />
                    {t.prioritySource === "ADMIN" && <AiSourceBadge source="ADMIN" />}
                  </span>
                </TableCell>
                <TableCell className="max-w-80 min-w-56 whitespace-normal">
                  <Link
                    href={href}
                    className="group block focus-visible:outline-none"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{t.ticketNumber}</span>
                    <span className="line-clamp-2 font-medium text-foreground group-hover:underline group-focus-visible:underline">
                      {t.subject}
                    </span>
                  </Link>
                  {t.messageCount > 0 && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="size-3" aria-hidden />
                      {t.messageCount} message{t.messageCount === 1 ? "" : "s"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{t.author.name}</div>
                  <div className="max-w-44 truncate text-xs text-muted-foreground">{t.author.email}</div>
                </TableCell>
                <TableCell className="max-w-44">
                  <span className="block truncate" title={t.book?.title}>
                    {t.book?.title ?? <span className="text-muted-foreground">General</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <CategoryBadge category={t.category} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  {t.assignee ? (
                    <span className="text-sm text-foreground">{t.assignee.name}</span>
                  ) : (
                    <span className="text-xs font-medium text-orange-600">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <AgeBadge createdAt={t.createdAt} status={t.status} />
                </TableCell>
                <TableCell className="pr-4">
                  <AiCell t={t} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
