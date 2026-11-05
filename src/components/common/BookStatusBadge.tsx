import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatBookStatus } from "@/lib/format";
import { bookStatusBadgeClasses } from "@/constants/books";

export function BookStatusBadge({
  status,
  isPublished,
  className,
}: {
  status: string;
  isPublished: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0",
        isPublished ? bookStatusBadgeClasses.published : bookStatusBadgeClasses.inProduction,
        className,
      )}
    >
      {formatBookStatus(status)}
    </Badge>
  );
}
