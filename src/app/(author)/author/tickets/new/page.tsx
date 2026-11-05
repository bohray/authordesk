import { Suspense } from "react";
import type { Metadata } from "next";
import { NewTicketForm } from "@/features/tickets/components/new-ticket-form";
import { DetailSkeleton } from "@/components/common/loading-state";

export const metadata: Metadata = { title: "New Ticket" };

export default function NewTicketPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <NewTicketForm />
    </Suspense>
  );
}
