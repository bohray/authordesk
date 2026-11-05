"use client";

import dynamic from "next/dynamic";
import { ErrorState } from "@/components/common/ErrorState";
import { useDashboardStats } from "@/features/admin-dashboard/hooks/useDashboardStats";
import { DashboardPageHeader } from "@/features/admin-dashboard/components/DashboardPageHeader";
import { DashboardSkeleton } from "@/features/admin-dashboard/components/DashboardSkeleton";

// The widgets chunk downloads while the stats request is in flight, so splitting it out of
// the route bundle costs no extra wait; the skeleton covers both.
const DashboardContent = dynamic(
  () => import("@/features/admin-dashboard/components/DashboardContent").then((m) => m.DashboardContent),
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
