"use client";

import Link from "next/link";
import { BookMarked, LifeBuoy, Plus } from "lucide-react";
import { NavLinks, type NavItem } from "@/components/layout/NavLinks";
import { buttonVariants } from "@/components/ui/Button";
import { routes } from "@/constants/routes";

const navItems: NavItem[] = [
  { href: routes.author.books, label: "My Books", icon: BookMarked },
  {
    href: routes.author.tickets,
    label: "My Tickets",
    icon: LifeBuoy,
    exclude: [routes.author.newTicket()],
  },
];

export function AuthorNav() {
  return <NavLinks items={navItems} label="Author navigation" />;
}

export function NewTicketButton() {
  return (
    <Link href={routes.author.newTicket()} className={buttonVariants({ size: "sm" })}>
      <Plus aria-hidden />
      <span className="hidden sm:inline">New Ticket</span>
      <span className="sr-only sm:hidden">New Ticket</span>
    </Link>
  );
}
