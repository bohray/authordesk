import { TicketsPageHeader } from "@/features/tickets/components/TicketsPageHeader";
import { TicketListSkeleton } from "@/features/tickets/components/TicketSkeletons";

export default function Loading() {
  return (
    <>
      <TicketsPageHeader />
      <TicketListSkeleton />
    </>
  );
}
