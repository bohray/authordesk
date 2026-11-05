import type { Metadata } from "next";
import { TicketDetail } from "@/features/tickets/components/ticket-detail";

export const metadata: Metadata = { title: "Ticket" };

export default async function AuthorTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  // Keyed so local state (e.g. a half-written reply) resets when switching tickets.
  return <TicketDetail key={ticketId} ticketId={ticketId} />;
}
