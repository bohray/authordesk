"use client";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { LiveStatus } from "@/hooks/useLiveUpdates";

const copy: Record<LiveStatus, { label: string; dot: string; title: string }> = {
  connecting: { label: "Connecting", dot: "bg-muted-foreground/60", title: "Connecting to live updates" },
  live: { label: "Live", dot: "bg-emerald-500 dark:bg-emerald-400", title: "Updates appear automatically" },
  paused: { label: "Paused", dot: "bg-muted-foreground/60", title: "Paused while this tab is hidden" },
  offline: {
    label: "Reconnecting",
    dot: "bg-amber-500 dark:bg-amber-400",
    title: "Live updates are retrying; data may be slightly out of date",
  },
};

export function LiveIndicator({ status, lastSyncedAt }: { status: LiveStatus; lastSyncedAt: string | null }) {
  const c = copy[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground"
      title={lastSyncedAt ? `${c.title}. Last sync ${formatDateTime(lastSyncedAt)}` : c.title}
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {status === "live" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", c.dot)} />
      </span>
      <span className="sr-only sm:not-sr-only">{c.label}</span>
    </span>
  );
}
