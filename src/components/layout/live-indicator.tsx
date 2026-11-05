"use client";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { LiveStatus } from "@/hooks/use-live-updates";

const COPY: Record<LiveStatus, { label: string; dot: string; title: string }> = {
  connecting: { label: "Connecting", dot: "bg-slate-400", title: "Connecting to live updates" },
  live: { label: "Live", dot: "bg-emerald-500", title: "Updates appear automatically" },
  paused: { label: "Paused", dot: "bg-slate-400", title: "Paused while this tab is hidden" },
  offline: {
    label: "Reconnecting",
    dot: "bg-amber-500",
    title: "Live updates are retrying; data may be slightly out of date",
  },
};

export function LiveIndicator({
  status,
  lastSyncedAt,
}: {
  status: LiveStatus;
  lastSyncedAt: string | null;
}) {
  const c = COPY[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground"
      title={lastSyncedAt ? `${c.title}. Last sync ${formatDateTime(lastSyncedAt)}` : c.title}
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {status === "live" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", c.dot)} />
      </span>
      {c.label}
    </span>
  );
}
