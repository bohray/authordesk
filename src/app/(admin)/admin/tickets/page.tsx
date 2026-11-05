import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketQueue } from "@/features/admin-queue/components/ticket-queue";
import { ListSkeleton } from "@/components/common/loading-state";

export const metadata: Metadata = { title: "Ticket Queue" };

export default function TicketQueuePage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <TicketQueue />
    </Suspense>
  );
}
