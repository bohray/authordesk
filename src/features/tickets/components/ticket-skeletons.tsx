import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingRegion,
  TextSkeleton,
  ThreadSkeleton,
  TicketHeaderSkeleton,
} from "@/components/common/skeletons";
import { TicketTips } from "@/features/tickets/components/ticket-tips";
import { NewTicketPageHeader } from "@/features/tickets/components/tickets-page-header";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** One placeholder per TicketRow: meta line, subject, book line, two-line preview. */
export function TicketRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {range(rows).map((i) => (
        <li key={i} className="space-y-2 rounded-xl border bg-background p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="ml-auto h-3.5 w-28" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-48" />
          <TextSkeleton lines={2} />
        </li>
      ))}
    </ul>
  );
}

/** Tabs strip + ticket rows, matching TicketList below its header. */
export function TicketListSkeleton() {
  return (
    <LoadingRegion label="Loading your tickets">
      <Skeleton className="mb-4 h-8 w-64 rounded-lg" />
      <TicketRowsSkeleton />
    </LoadingRegion>
  );
}

/** Mirrors TicketDetail: back link, header + status hint, query card, thread, reply box. */
export function TicketDetailSkeleton() {
  return (
    <LoadingRegion label="Loading ticket" className="mx-auto max-w-3xl">
      <Skeleton className="mb-3 h-7 w-28" />
      <div className="mb-5 space-y-2">
        <TicketHeaderSkeleton />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="space-y-5">
        <Card size="sm">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <TextSkeleton lines={3} />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <ThreadSkeleton messages={2} />
        </div>
        <Card size="sm">
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="ml-auto h-8 w-28" />
          </CardContent>
        </Card>
      </div>
    </LoadingRegion>
  );
}

/** The form fields while the book list loads (book select, subject, description, file, submit). */
export function TicketFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      {["w-48", "w-16"].map((w) => (
        <div key={w} className="space-y-1.5">
          <Skeleton className={`h-4 ${w}`} />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-36 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

/** Body of the new-ticket page: form card skeleton + the (static) tips sidebar. */
export function NewTicketBodySkeleton() {
  return (
    <LoadingRegion label="Loading form" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardContent>
          <TicketFormSkeleton />
        </CardContent>
      </Card>
      <aside className="space-y-4">
        <TicketTips />
      </aside>
    </LoadingRegion>
  );
}

/** Whole new-ticket page (header included) for `loading.tsx` and the Suspense fallback. */
export function NewTicketPageSkeleton() {
  return (
    <>
      <NewTicketPageHeader />
      <NewTicketBodySkeleton />
    </>
  );
}
