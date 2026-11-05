import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Renders INR with Indian grouping. `null` renders the fallback (e.g. MRP for unpublished books). */
export function Currency({
  amount,
  fallback = "—",
  className,
}: {
  amount: number | null | undefined;
  fallback?: string;
  className?: string;
}) {
  if (amount === null || amount === undefined) {
    return <span className={cn("text-muted-foreground", className)}>{fallback}</span>;
  }
  return <span className={cn("tabular-nums", className)}>{formatINR(amount)}</span>;
}
