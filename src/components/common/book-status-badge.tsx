import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBookStatus } from "@/lib/format";

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
        isPublished
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25"
          : "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25",
        className,
      )}
    >
      {formatBookStatus(status)}
    </Badge>
  );
}
