import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketQueue } from "@/features/admin-queue/components/ticket-queue";
import { QueuePageSkeleton } from "@/features/admin-queue/components/queue-skeletons";

export const metadata: Metadata = { title: "Ticket Queue" };

export default function TicketQueuePage() {
  // Filters live in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<QueuePageSkeleton />}>
      <TicketQueue />
    </Suspense>
  );
}
