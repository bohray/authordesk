"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenText } from "lucide-react";
import { useLiveUpdates, type LiveScope } from "@/hooks/use-live-updates";
import { LiveIndicator } from "@/components/layout/live-indicator";
import { APP_NAME } from "@/constants/ui";
import { cn } from "@/lib/utils";

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
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
          <Link href={homeHref} className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpenText className="size-4" aria-hidden />
            </span>
            <span className="hidden sm:inline">{APP_NAME}</span>
            {scope === "admin" && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Ops
              </span>
            )}
          </Link>
          <div className="hidden min-w-0 flex-1 md:block">{nav}</div>
          <div className="ml-auto flex items-center gap-2">
            <LiveIndicator status={live.status} lastSyncedAt={live.lastSyncedAt} />
            {actions}
            {userMenu}
          </div>
        </div>
        <div className={cn("border-t px-4 py-1.5 md:hidden")}>{nav}</div>
      </header>
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
