import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_BADGE_CLASSES } from "@/constants/ui";
import { TICKET_PRIORITY_LABELS, type TicketPriority } from "@/shared/constants/ticket";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority | null;
  className?: string;
}) {
  const key = priority ?? "UNCLASSIFIED";
  return (
    <Badge variant="outline" className={cn("border-0", PRIORITY_BADGE_CLASSES[key], className)}>
      {priority ? TICKET_PRIORITY_LABELS[priority] : "Unclassified"}
    </Badge>
  );
}
