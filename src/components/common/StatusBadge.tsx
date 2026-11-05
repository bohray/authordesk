import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { statusBadgeClasses } from "@/constants/ui";
import { ticketStatusLabels, type TicketStatus } from "@/shared/constants/ticket";

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-0", statusBadgeClasses[status], className)}>
      {ticketStatusLabels[status]}
    </Badge>
  );
}
