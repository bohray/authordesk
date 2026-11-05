import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Solid colour class shared by the legend dot and the bar. */
  dot: string;
  /** When set, the row links to the matching queue view. */
  href?: string;
}

export function Panel({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BarRowContent({ row, max }: { row: BarRow; max: number }) {
  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", row.dot)} aria-hidden />
          {row.label}
        </span>
        <span className="font-medium tabular-nums">{formatNumber(row.value)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn("h-full rounded-full", row.dot)} style={{ width: `${(row.value / max) * 100}%` }} />
      </div>
    </>
  );
}

/** Horizontal bars scaled to the largest row. */
export function BarList({ rows }: { rows: BarRow[] }) {
  // At least 1 so an all-zero list renders empty bars instead of dividing by zero.
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.key}>
          {row.href ? (
            <Link href={row.href} className="block rounded-md p-1 -m-1 hover:bg-muted/50">
              <BarRowContent row={row} max={max} />
            </Link>
          ) : (
            <BarRowContent row={row} max={max} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</dd>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
