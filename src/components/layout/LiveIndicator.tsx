"use client";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { liveStatusDisplay } from "@/constants/layout";
import type { LiveStatus } from "@/hooks/useLiveUpdates";

export function LiveIndicator({ status, lastSyncedAt }: { status: LiveStatus; lastSyncedAt: string | null }) {
  const display = liveStatusDisplay[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground"
      title={lastSyncedAt ? `${display.title}. Last sync ${formatDateTime(lastSyncedAt)}` : display.title}
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {status === "live" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", display.dotClass)} />
      </span>
      <span className="sr-only sm:not-sr-only">{display.label}</span>
    </span>
  );
}
