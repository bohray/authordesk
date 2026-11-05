import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { categoryBadgeClasses } from "@/constants/ui";
import { ticketCategoryLabels, type TicketCategory } from "@/shared/constants/ticket";

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
    <Badge variant="outline" className={cn("border-0", categoryBadgeClasses[category], className)}>
      {ticketCategoryLabels[category]}
    </Badge>
  );
}
