"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNow } from "@/components/common/relative-time";
import { cn } from "@/lib/utils";
import { formatAge, formatDateTime, hoursSince } from "@/lib/format";
import { AGE_DANGER_HOURS, AGE_WARN_HOURS } from "@/constants/ui";
import { UNRESOLVED_STATUSES, type TicketStatus } from "@/shared/constants/ticket";

/** Ticket age. Unresolved tickets turn amber after 24h and red after 48h. */
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
  const unresolved = UNRESOLVED_STATUSES.includes(status);
  const hours = hoursSince(createdAt, now);
  const tone = !unresolved
    ? "bg-muted text-muted-foreground"
    : hours > AGE_DANGER_HOURS
      ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
      : hours > AGE_WARN_HOURS
        ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"
        : "bg-muted text-foreground";
  return (
    <Badge
      variant="outline"
      className={cn("border-0 tabular-nums", tone, className)}
      title={`Created ${formatDateTime(createdAt)}`}
    >
      <Clock aria-hidden />
      {formatAge(createdAt, now)}
    </Badge>
  );
}
