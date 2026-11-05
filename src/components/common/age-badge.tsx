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
      ? "bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/25 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/35"
      : hours > AGE_WARN_HOURS
        ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25"
        : "bg-muted text-foreground ring-1 ring-inset ring-border";
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
