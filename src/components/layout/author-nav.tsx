"use client";

import Link from "next/link";
import { BookMarked, LifeBuoy, Plus } from "lucide-react";
import { NavLinks, type NavItem } from "@/components/layout/nav-links";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

const ITEMS: NavItem[] = [
  { href: ROUTES.author.books, label: "My Books", icon: BookMarked },
  {
    href: ROUTES.author.tickets,
    label: "My Tickets",
    icon: LifeBuoy,
    exclude: [ROUTES.author.newTicket()],
  },
];

export function AuthorNav() {
  return <NavLinks items={ITEMS} label="Author navigation" />;
}

export function NewTicketButton() {
  return (
    <Link href={ROUTES.author.newTicket()} className={buttonVariants({ size: "sm" })}>
      <Plus aria-hidden />
      <span className="hidden sm:inline">New Ticket</span>
      <span className="sr-only sm:hidden">New Ticket</span>
    </Link>
  );
}
