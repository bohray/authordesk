"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLiveUpdates, type LiveScope } from "@/hooks/use-live-updates";
import { LiveIndicator } from "@/components/layout/live-indicator";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { APP_NAME } from "@/constants/ui";

/**
 * Portal chrome: top bar with brand, nav, live indicator and user menu.
 * Also the single mount point for live updates in each portal.
 */
export function AppShell({
  scope,
  homeHref,
  nav,
  actions,
  userMenu,
  children,
}: {
  scope: LiveScope;
  homeHref: string;
  nav: ReactNode;
  actions?: ReactNode;
  userMenu: ReactNode;
  children: ReactNode;
}) {
  const live = useLiveUpdates(scope);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            href={homeHref}
            className="flex shrink-0 items-center gap-2 rounded-lg"
            aria-label={`${APP_NAME} home`}
          >
            <Wordmark textClassName="hidden sm:inline" />
            {scope === "admin" && (
              <span className="rounded-md bg-highlight/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-accent-foreground uppercase ring-1 ring-highlight/40 ring-inset">
                Ops
              </span>
            )}
          </Link>
          <div className="hidden h-full min-w-0 flex-1 md:block">{nav}</div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <LiveIndicator status={live.status} lastSyncedAt={live.lastSyncedAt} />
            {actions}
            <ThemeToggle />
            {userMenu}
          </div>
        </div>
        <div className="border-t border-border/60 px-2 md:hidden">{nav}</div>
      </header>
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 md:py-10">{children}</main>
    </div>
  );
}
