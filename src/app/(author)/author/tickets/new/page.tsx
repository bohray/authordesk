import { Suspense } from "react";
import type { Metadata } from "next";
import { NewTicketForm } from "@/features/tickets/components/NewTicketForm";
import { NewTicketPageSkeleton } from "@/features/tickets/components/TicketSkeletons";

export const metadata: Metadata = { title: "New Ticket" };

export default function NewTicketPage() {
  // NewTicketForm reads `?bookId` with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<NewTicketPageSkeleton />}>
      <NewTicketForm />
    </Suspense>
  );
}
