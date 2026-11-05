import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";

/**
 * Layout-matching skeleton building blocks. Each one mirrors the spacing of the real
 * component it stands in for, so swapping skeleton → content causes no layout shift.
 * Server-safe (no hooks), so route-level `loading.tsx` files can use them too.
 */

/** Static placeholder lists never reorder, so index keys are fine here. */
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Busy region with a screen-reader label; wraps every skeleton. */
export function LoadingRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Paragraph placeholder: full-width lines with a shorter last line. */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {range(lines).map((i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Cell widths cycle so rows don't look like a barcode. */
const cellWidths = ["w-16", "w-40", "w-28", "w-24", "w-20", "w-32"];

/**
 * Table with real column headers and skeleton cells. Pass header labels to match the
 * final table exactly; `rowClassName` lets callers match the real row height.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  className,
  rowClassName = "h-14",
  label = "Loading table",
}: {
  columns: readonly string[];
  rows?: number;
  className?: string;
  rowClassName?: string;
  label?: string;
}) {
  const last = columns.length - 1;
  return (
    <LoadingRegion label={label} className={cn("overflow-hidden rounded-xl border bg-background", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((c, i) => (
              <TableHead key={c || i} className={cn(i === 0 && "pl-4", i === last && "pr-4")}>
                {c ? c : <span className="sr-only">Actions</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {range(rows).map((r) => (
            <TableRow key={r} className={cn("hover:bg-transparent", rowClassName)}>
              {columns.map((c, i) => (
                <TableCell key={c || i} className={cn(i === 0 && "pl-4", i === last && "pr-4")}>
                  <Skeleton className={cn("h-4", cellWidths[(i + r) % cellWidths.length])} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LoadingRegion>
  );
}

/** Grid of stat/metric cards. Pass the same grid classes as the real grid. */
export function CardGridSkeleton({
  count = 4,
  className,
  cardClassName,
  label = "Loading summary",
}: {
  count?: number;
  className?: string;
  /** Per-card classes; a function lets the last card span columns like the real one. */
  cardClassName?: string | ((index: number) => string | undefined);
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {range(count).map((i) => (
        <Card
          key={i}
          size="sm"
          className={typeof cardClassName === "function" ? cardClassName(i) : cardClassName}
        >
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </LoadingRegion>
  );
}

/** Generic card with a title bar and some lines, for side panels. */
export function PanelSkeleton({
  lines = 4,
  className,
  bodyClassName,
}: {
  lines?: number;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card size="sm" className={className} aria-hidden>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className={cn("space-y-2.5", bodyClassName)}>
        {range(lines).map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Chat thread placeholder mirroring ConversationThread (avatar + bubble, alternating sides). */
export function ThreadSkeleton({ messages = 3, className }: { messages?: number; className?: string }) {
  return (
    <ol className={cn("space-y-4", className)} aria-hidden>
      {range(messages).map((i) => {
        const mine = i % 2 === 1;
        return (
          <li key={i} className={cn("flex gap-3", mine && "flex-row-reverse")}>
            <Skeleton className="mt-0.5 size-6 shrink-0 rounded-full" />
            <div className={cn("flex w-full max-w-[85%] flex-col gap-1", mine && "items-end")}>
              <Skeleton className="h-3 w-36" />
              <Skeleton className={cn("h-16 rounded-xl", mine ? "w-3/5" : "w-4/5")} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Ticket title block: number + badges, subject line, meta line. */
export function TicketHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/** "Original query" card placeholder. */
export function QueryCardSkeleton({ className }: { className?: string }) {
  return (
    <Card size="sm" className={className} aria-hidden>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <TextSkeleton lines={3} />
      </CardContent>
    </Card>
  );
}

/**
 * Two-column detail layout (main + aside) used by the admin ticket page. Defaults render a
 * plausible ticket; pass `main`/`aside` to customise.
 */
export function DetailSkeleton({
  main,
  aside,
  className,
  label = "Loading ticket",
}: {
  main?: ReactNode;
  aside?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <LoadingRegion
      label={label}
      className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]", className)}
    >
      <div className="min-w-0 space-y-5">
        {main ?? (
          <>
            <TicketHeaderSkeleton />
            <QueryCardSkeleton />
            <ThreadSkeleton />
          </>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        {aside ?? (
          <>
            <PanelSkeleton lines={3} />
            <PanelSkeleton lines={4} />
          </>
        )}
      </div>
    </LoadingRegion>
  );
}
