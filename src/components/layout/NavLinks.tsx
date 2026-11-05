"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/constants/layout";

function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exclude?.some((p) => pathname.startsWith(p))) return false;
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function NavLinks({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="h-full">
      <ul className="flex h-full items-stretch gap-1 overflow-x-auto [scrollbar-width:none]">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/nav relative inline-flex items-center gap-1.5 px-2.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                  active
                    ? "text-primary after:bg-primary"
                    : "text-muted-foreground after:bg-transparent hover:text-foreground hover:after:bg-border",
                )}
              >
                <span className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 group-focus-visible/nav:ring-2 group-focus-visible/nav:ring-ring/50">
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
