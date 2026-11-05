import { PageHeader } from "@/components/common/page-header";

/** Shared by the dashboard and its `loading.tsx`, so the header never shifts. */
export function DashboardPageHeader() {
  return (
    <PageHeader title="Dashboard" description="Queue health and AI performance at a glance. Updates live." />
  );
}
