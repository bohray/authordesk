/**
 * Portal chrome constants: nav items, theme options and live-indicator display.
 */
import {
  BookMarked,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/constants/routes";
import type { LiveStatus } from "@/hooks/useLiveUpdates";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exact path only (otherwise prefix match). */
  exact?: boolean;
  /** Paths under `href` that should not mark this item active. */
  exclude?: string[];
}

export const authorNavItems: NavItem[] = [
  { href: routes.author.books, label: "My Books", icon: BookMarked },
  {
    href: routes.author.tickets,
    label: "My Tickets",
    icon: LifeBuoy,
    // "New Ticket" has its own button, so it shouldn't highlight "My Tickets".
    exclude: [routes.author.newTicket()],
  },
];

export const adminNavItems: NavItem[] = [
  { href: routes.admin.tickets, label: "Ticket Queue", icon: Inbox },
  { href: routes.admin.dashboard, label: "Dashboard", icon: LayoutDashboard },
];

export const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];

export type ThemeValue = (typeof themeOptions)[number]["value"];
export const defaultTheme: ThemeValue = "system";

const idleDotClass = "bg-muted-foreground/60";

export const liveStatusDisplay = {
  connecting: { label: "Connecting", dotClass: idleDotClass, title: "Connecting to live updates" },
  live: {
    label: "Live",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
    title: "Updates appear automatically",
  },
  paused: { label: "Paused", dotClass: idleDotClass, title: "Paused while this tab is hidden" },
  offline: {
    label: "Reconnecting",
    dotClass: "bg-amber-500 dark:bg-amber-400",
    title: "Live updates are retrying; data may be slightly out of date",
  },
} as const satisfies Record<LiveStatus, { label: string; dotClass: string; title: string }>;
