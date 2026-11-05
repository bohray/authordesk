"use client";

import { Inbox, LayoutDashboard } from "lucide-react";
import { NavLinks, type NavItem } from "@/components/layout/NavLinks";
import { routes } from "@/constants/routes";

const navItems: NavItem[] = [
  { href: routes.admin.tickets, label: "Ticket Queue", icon: Inbox },
  { href: routes.admin.dashboard, label: "Dashboard", icon: LayoutDashboard },
];

export function AdminNav() {
  return <NavLinks items={navItems} label="Admin navigation" />;
}
