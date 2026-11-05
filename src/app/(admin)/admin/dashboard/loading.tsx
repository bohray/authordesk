import { DashboardPageHeader } from "@/features/admin-dashboard/components/dashboard-page-header";
import { DashboardSkeleton } from "@/features/admin-dashboard/components/dashboard-skeleton";

export default function Loading() {
  return (
    <>
      <DashboardPageHeader />
      <DashboardSkeleton />
    </>
  );
}
