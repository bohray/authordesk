import type { Metadata } from "next";
import { TicketList } from "@/features/tickets/components/ticket-list";

export const metadata: Metadata = { title: "My Tickets" };

export default function MyTicketsPage() {
  return <TicketList />;
}
