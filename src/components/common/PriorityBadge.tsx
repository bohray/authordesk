import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { priorityBadgeClasses } from "@/constants/ui";
import { ticketPriorityLabels, type TicketPriority } from "@/shared/constants/ticket";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority | null;
  className?: string;
}) {
  const key = priority ?? "UNCLASSIFIED";
  return (
    <Badge variant="outline" className={cn("border-0", priorityBadgeClasses[key], className)}>
      {priority ? ticketPriorityLabels[priority] : "Unclassified"}
    </Badge>
  );
}
