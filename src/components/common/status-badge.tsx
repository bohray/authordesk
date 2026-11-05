import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASSES } from "@/constants/ui";
import { TICKET_STATUS_LABELS, type TicketStatus } from "@/shared/constants/ticket";

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-0", STATUS_BADGE_CLASSES[status], className)}>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
