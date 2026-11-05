import type { Metadata } from "next";
import { AdminTicketView } from "@/features/admin-ticket/components/AdminTicketView";

export const metadata: Metadata = { title: "Ticket" };

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <AdminTicketView key={ticketId} ticketId={ticketId} />;
}
