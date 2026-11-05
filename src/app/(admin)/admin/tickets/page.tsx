import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketQueue } from "@/features/admin-queue/components/TicketQueue";
import { QueuePageSkeleton } from "@/features/admin-queue/components/QueueSkeletons";

export const metadata: Metadata = { title: "Ticket Queue" };

export default function TicketQueuePage() {
  // Filters live in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<QueuePageSkeleton />}>
      <TicketQueue />
    </Suspense>
  );
}
