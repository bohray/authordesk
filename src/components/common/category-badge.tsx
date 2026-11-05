import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_BADGE_CLASSES } from "@/constants/ui";
import { TICKET_CATEGORY_LABELS, type TicketCategory } from "@/shared/constants/ticket";

export function CategoryBadge({
  category,
  className,
}: {
  category: TicketCategory | null;
  className?: string;
}) {
  if (!category) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Uncategorised
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("border-0", CATEGORY_BADGE_CLASSES[category], className)}>
      {TICKET_CATEGORY_LABELS[category]}
    </Badge>
  );
}
