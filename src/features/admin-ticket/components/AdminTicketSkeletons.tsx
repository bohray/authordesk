import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DetailSkeleton,
  PanelSkeleton,
  QueryCardSkeleton,
  TextSkeleton,
  ThreadSkeleton,
  TicketHeaderSkeleton,
} from "@/components/common/Skeletons";

/** Mirrors the AI draft editor area (status line + textarea-sized block). */
export function DraftEditorSkeleton({ message }: { message?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="min-h-40 space-y-2 rounded-lg border p-3" aria-hidden>
        <TextSkeleton lines={5} />
      </div>
      <Skeleton className="h-3 w-72" aria-hidden />
    </div>
  );
}

/** "Reply to author" card with header, editor and the action row. */
function DraftPanelSkeleton() {
  return (
    <Card size="sm" aria-hidden>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="min-h-40 space-y-2 rounded-lg border p-3">
          <TextSkeleton lines={5} />
        </div>
        <div className="flex justify-between gap-2 border-t pt-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-56" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Internal notes panel placeholder (also the lazy-load fallback). */
export function NotesSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border p-3" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="ml-auto h-7 w-24" />
    </div>
  );
}

/** Activity card placeholder (also the lazy-load fallback). */
export function TimelineSkeleton() {
  return <PanelSkeleton lines={4} />;
}

/** Full two-column admin ticket layout: header + controls, query, thread, draft | side cards. */
export function AdminTicketSkeleton() {
  return (
    <DetailSkeleton
      main={
        <>
          <div className="space-y-3">
            <Skeleton className="h-7 w-20" />
            <TicketHeaderSkeleton />
            <Skeleton className="h-[4.5rem] w-full rounded-xl" />
          </div>
          <QueryCardSkeleton />
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <ThreadSkeleton messages={2} />
          </div>
          <DraftPanelSkeleton />
        </>
      }
      aside={
        <>
          <PanelSkeleton lines={3} bodyClassName="space-y-3" />
          <NotesSkeleton />
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={6} />
          <TimelineSkeleton />
        </>
      }
    />
  );
}
