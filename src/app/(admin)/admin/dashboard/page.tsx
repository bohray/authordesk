import type { Metadata } from "next";
import { DashboardView } from "@/features/admin-dashboard/components/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <DashboardView />;
}
