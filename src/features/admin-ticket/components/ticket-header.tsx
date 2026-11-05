"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, UserMinus, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/forms/select-field";
import { AgeBadge } from "@/components/common/age-badge";
import { LazyConfirmDialog } from "@/components/common/lazy-confirm-dialog";
import { PriorityBadge } from "@/components/common/priority-badge";
import { RelativeTime } from "@/components/common/relative-time";
import { StatusBadge } from "@/components/common/status-badge";
import { TONE_TEXT } from "@/components/common/tones";
import { ROUTES } from "@/constants/routes";
import { bookLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentAdmin, useUpdateTicket } from "@/features/admin-ticket/hooks/use-admin-ticket";
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from "@/shared/constants/ticket";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

const STATUS_OPTIONS = TICKET_STATUSES.map((s) => ({ value: s, label: TICKET_STATUS_LABELS[s] }));

export function TicketHeader({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const update = useUpdateTicket(ticket.id);
  const { data: me } = useCurrentAdmin();
  const [confirmClose, setConfirmClose] = useState(false);

  const changeStatus = (status: TicketStatus) => {
    if (status === ticket.status) return;
    if (status === "CLOSED") {
      setConfirmClose(true);
      return;
    }
    update.mutate({
      patch: { status },
      successMessage: `Status changed to ${TICKET_STATUS_LABELS[status]}`,
    });
  };

  const assignedToMe = !!ticket.assignee && !!me && ticket.assignee.id === me.id;
  const pendingAssign = update.isPending && update.variables?.patch.assigneeId !== undefined;

  return (
    <header className="space-y-3">
      <Link
        href={ROUTES.admin.tickets}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft aria-hidden />
        Queue
      </Link>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">{ticket.ticketNumber}</span>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <AgeBadge createdAt={ticket.createdAt} status={ticket.status} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{ticket.subject}</h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{ticket.author.name}</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <BookOpen className="size-3.5" aria-hidden />
          {bookLabel(ticket.book)}
        </span>
        <span aria-hidden>·</span>
        <span>
          Opened <RelativeTime date={ticket.createdAt} />
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-background p-3">
        <div className="space-y-1">
          <Label htmlFor="ticket-status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <SelectField
            id="ticket-status"
            value={ticket.status}
            onValueChange={(v) => changeStatus(v as TicketStatus)}
            options={STATUS_OPTIONS}
            disabled={update.isPending}
            className="h-9 w-40"
          />
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Assignee</span>
          <div className="flex h-9 items-center gap-2">
            <span className="text-sm">
              {ticket.assignee ? (
                assignedToMe ? (
                  "You"
                ) : (
                  ticket.assignee.name
                )
              ) : (
                <span className={cn("font-medium", TONE_TEXT.attention)}>Unassigned</span>
              )}
            </span>
            {assignedToMe ? (
              <Button
                variant="outline"
                size="sm"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({ patch: { assigneeId: null }, successMessage: "Ticket unassigned" })
                }
              >
                {pendingAssign ? <Loader2 className="animate-spin" aria-hidden /> : <UserMinus aria-hidden />}
                Unassign
              </Button>
            ) : (
              <Button
                variant={ticket.assignee ? "outline" : "default"}
                size="sm"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({ patch: { assigneeId: "me" }, successMessage: "Assigned to you" })
                }
              >
                {pendingAssign ? <Loader2 className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
                {ticket.assignee ? "Take over" : "Assign to me"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <LazyConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Close this ticket?"
        description="The author won't be able to reply to a closed ticket. Use Resolved if they might still follow up."
        confirmLabel="Close ticket"
        destructive
        isPending={update.isPending}
        onConfirm={() =>
          update.mutate(
            { patch: { status: "CLOSED" }, successMessage: "Ticket closed" },
            { onSettled: () => setConfirmClose(false) },
          )
        }
      />
    </header>
  );
}
