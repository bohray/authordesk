import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ROUTES } from "@/constants/routes";

/** Shared by the page and its `loading.tsx`, so the header never shifts when data arrives. */
export function TicketsPageHeader() {
  return (
    <PageHeader
      title="My Tickets"
      description="Your support conversations. Replies from our team appear here automatically."
      actions={
        <Link href={ROUTES.author.newTicket()} className={buttonVariants()}>
          <Plus aria-hidden />
          New Ticket
        </Link>
      }
    />
  );
}

export function NewTicketPageHeader() {
  return (
    <PageHeader
      title="New Ticket"
      description="Tell us what you need help with. Our support team replies right here."
    />
  );
}
