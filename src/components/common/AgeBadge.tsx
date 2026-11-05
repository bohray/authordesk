"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useNow } from "@/components/common/RelativeTime";
import { cn } from "@/lib/utils";
import { formatAge, formatDateTime, hoursSince } from "@/lib/format";
import { ageDangerHours, ageWarnHours } from "@/constants/ui";
import { ticketAgeBadgeClasses, type TicketAgeLevel } from "@/constants/tickets";
import { unresolvedStatuses, type TicketStatus } from "@/shared/constants/ticket";

function ageLevel(status: TicketStatus, hours: number): TicketAgeLevel {
  if (!unresolvedStatuses.includes(status)) return "resolved";
  if (hours > ageDangerHours) return "danger";
  if (hours > ageWarnHours) return "warn";
  return "fresh";
}

/** Ticket age. Unresolved tickets turn amber after `ageWarnHours` and red after `ageDangerHours`. */
export function AgeBadge({
  createdAt,
  status,
  className,
}: {
  createdAt: string;
  status: TicketStatus;
  className?: string;
}) {
  const now = useNow();
  const level = ageLevel(status, hoursSince(createdAt, now));
  return (
    <Badge
      variant="outline"
      className={cn("border-0 tabular-nums", ticketAgeBadgeClasses[level], className)}
      title={`Created ${formatDateTime(createdAt)}`}
    >
      <Clock aria-hidden />
      {formatAge(createdAt, now)}
    </Badge>
  );
}
