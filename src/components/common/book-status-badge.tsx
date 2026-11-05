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
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
          : "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
        className,
      )}
    >
      {formatBookStatus(status)}
    </Badge>
  );
}
