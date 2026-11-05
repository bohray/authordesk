"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { NavLinks } from "@/components/layout/NavLinks";
import { buttonVariants } from "@/components/ui/Button";
import { authorNavItems } from "@/constants/layout";
import { routes } from "@/constants/routes";

const newTicketLabel = "New Ticket";

export function AuthorNav() {
  return <NavLinks items={authorNavItems} label="Author navigation" />;
}

/** Top-bar shortcut; icon-only on phones, with the label kept for screen readers. */
export function NewTicketButton() {
  return (
    <Link href={routes.author.newTicket()} className={buttonVariants({ size: "sm" })}>
      <Plus aria-hidden />
      <span className="hidden sm:inline">{newTicketLabel}</span>
      <span className="sr-only sm:hidden">{newTicketLabel}</span>
    </Link>
  );
}
