"use client";

import { Inbox, LayoutDashboard } from "lucide-react";
import { NavLinks, type NavItem } from "@/components/layout/nav-links";
import { ROUTES } from "@/constants/routes";

const ITEMS: NavItem[] = [
  { href: ROUTES.admin.tickets, label: "Ticket Queue", icon: Inbox },
  { href: ROUTES.admin.dashboard, label: "Dashboard", icon: LayoutDashboard },
];

export function AdminNav() {
  return <NavLinks items={ITEMS} label="Admin navigation" />;
}
