import { TicketsPageHeader } from "@/features/tickets/components/tickets-page-header";
import { TicketListSkeleton } from "@/features/tickets/components/ticket-skeletons";

export default function Loading() {
  return (
    <>
      <TicketsPageHeader />
      <TicketListSkeleton />
    </>
  );
}
