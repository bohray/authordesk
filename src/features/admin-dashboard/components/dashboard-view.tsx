"use client";

import dynamic from "next/dynamic";
import { ErrorState } from "@/components/common/error-state";
import { useDashboardStats } from "@/features/admin-dashboard/hooks/use-dashboard-stats";
import { DashboardPageHeader } from "@/features/admin-dashboard/components/dashboard-page-header";
import { DashboardSkeleton } from "@/features/admin-dashboard/components/dashboard-skeleton";

// The widgets chunk downloads while the stats request is in flight, so splitting it out of
// the route bundle costs no extra wait; the skeleton covers both.
const DashboardContent = dynamic(
  () => import("@/features/admin-dashboard/components/dashboard-content").then((m) => m.DashboardContent),
  { loading: () => <DashboardSkeleton /> },
);

export function DashboardView() {
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboardStats();
  return (
    <>
      <DashboardPageHeader />
      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState title="Couldn't load stats" error={error} onRetry={() => refetch()} isRetrying={isRefetching} />
      ) : (
        <DashboardContent data={data} />
      )}
    </>
  );
}
