import { DashboardPageHeader } from "@/features/admin-dashboard/components/DashboardPageHeader";
import { DashboardSkeleton } from "@/features/admin-dashboard/components/DashboardSkeleton";

export default function Loading() {
  return (
    <>
      <DashboardPageHeader />
      <DashboardSkeleton />
    </>
  );
}
