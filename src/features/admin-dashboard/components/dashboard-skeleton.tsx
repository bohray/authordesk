import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "@/components/common/skeletons";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function MetricSkeleton() {
  return (
    <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

function BarPanelSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {range(rows).map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-6" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Mirrors DashboardContent: 4 metrics, 3 panels (priority, status, AI health), quick links. */
export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading dashboard" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {range(4).map((i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarPanelSkeleton rows={5} />
        <BarPanelSkeleton rows={4} />
        <Card size="sm" className="md:col-span-2 xl:col-span-1">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {range(6).map((i) => (
              <MetricSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </div>
    </LoadingRegion>
  );
}
