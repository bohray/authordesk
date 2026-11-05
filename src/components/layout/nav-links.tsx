"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exact path only (otherwise prefix match). */
  exact?: boolean;
  /** Paths under `href` that should not mark this item active. */
  exclude?: string[];
}

export function NavLinks({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) => {
    if (item.exclude?.some((p) => pathname.startsWith(p))) return false;
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  };
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
