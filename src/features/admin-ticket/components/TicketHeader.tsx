"use client";

import { useState } from "react";
import { BookOpen, Loader2, UserMinus, UserPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { SelectField } from "@/components/forms/SelectField";
import { AgeBadge } from "@/components/common/AgeBadge";
import { LazyConfirmDialog } from "@/components/common/LazyConfirmDialog";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { RelativeTime } from "@/components/common/RelativeTime";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toneText } from "@/components/common/tones";
import { closeTicketDialog, ticketStatusOptions, ticketUpdateMessages } from "@/constants/adminTicket";
import { queueAssigneeLabels } from "@/constants/queue";
import { bookLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentAdmin, useUpdateTicket } from "@/features/admin-ticket/hooks/useAdminTicket";
import { BackToQueueLink } from "@/features/admin-ticket/components/BackToQueueLink";
import { ticketStatuses, ticketStatusLabels, type TicketStatus } from "@/shared/constants/ticket";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

type TicketUpdate = ReturnType<typeof useUpdateTicket>;

interface AssignAction {
  variant: "outline" | "default";
  Icon: LucideIcon;
  label: string;
  assigneeId: "me" | null;
  successMessage: string;
}

function isTicketStatus(value: string): value is TicketStatus {
  return (ticketStatuses as readonly string[]).includes(value);
}

/** Ticket number, badges, subject and the author / book / opened byline. */
function TicketSummary({ ticket }: { ticket: AdminTicketDetailDTO }) {
  return (
    <>
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
    </>
  );
}

/** Current assignee plus a single assign / take over / unassign action. */
function AssigneeControl({ ticket, update }: { ticket: AdminTicketDetailDTO; update: TicketUpdate }) {
  const { data: me } = useCurrentAdmin();
  const assignedToMe = !!ticket.assignee && !!me && ticket.assignee.id === me.id;
  const pendingAssign = update.isPending && update.variables?.patch.assigneeId !== undefined;

  const action: AssignAction = assignedToMe
    ? {
        variant: "outline",
        Icon: UserMinus,
        label: "Unassign",
        assigneeId: null,
        successMessage: ticketUpdateMessages.unassigned,
      }
    : {
        variant: ticket.assignee ? "outline" : "default",
        Icon: UserPlus,
        label: ticket.assignee ? "Take over" : "Assign to me",
        assigneeId: "me",
        successMessage: ticketUpdateMessages.assigned,
      };

  const handleAction = () =>
    update.mutate({ patch: { assigneeId: action.assigneeId }, successMessage: action.successMessage });

  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">Assignee</span>
      <div className="flex h-9 items-center gap-2">
        <span className="text-sm">
          {!ticket.assignee ? (
            <span className={cn("font-medium", toneText.attention)}>{queueAssigneeLabels.unassigned}</span>
          ) : assignedToMe ? (
            "You"
          ) : (
            ticket.assignee.name
          )}
        </span>
        <Button variant={action.variant} size="sm" disabled={update.isPending} onClick={handleAction}>
          {pendingAssign ? <Loader2 className="animate-spin" aria-hidden /> : <action.Icon aria-hidden />}
          {action.label}
        </Button>
      </div>
    </div>
  );
}

export function TicketHeader({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const update = useUpdateTicket(ticket.id);
  const [confirmClose, setConfirmClose] = useState(false);

  const handleStatusChange = (value: string) => {
    if (!isTicketStatus(value) || value === ticket.status) return;
    // Closing locks the author out of replying, so it goes through a confirmation first.
    if (value === "CLOSED") {
      setConfirmClose(true);
      return;
    }
    update.mutate({
      patch: { status: value },
      successMessage: ticketUpdateMessages.status(ticketStatusLabels[value]),
    });
  };

  const closeTicket = () =>
    update.mutate(
      { patch: { status: "CLOSED" }, successMessage: ticketUpdateMessages.closed },
      { onSettled: () => setConfirmClose(false) },
    );

  return (
    <header className="space-y-3">
      <BackToQueueLink />
      <TicketSummary ticket={ticket} />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-background p-3">
        <div className="space-y-1">
          <Label htmlFor="ticket-status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <SelectField
            id="ticket-status"
            value={ticket.status}
            onValueChange={handleStatusChange}
            options={ticketStatusOptions}
            disabled={update.isPending}
            className="h-9 w-40"
          />
        </div>
        <AssigneeControl ticket={ticket} update={update} />
      </div>

      <LazyConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={closeTicketDialog.title}
        description={closeTicketDialog.description}
        confirmLabel={closeTicketDialog.confirmLabel}
        destructive
        isPending={update.isPending}
        onConfirm={closeTicket}
      />
    </header>
  );
}
