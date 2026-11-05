"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const tickMs = 30_000;
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, tickMs);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Shared, coarse "current time" that re-renders subscribers every 30s. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}

export function RelativeTime({ date, className }: { date: string | null; className?: string }) {
  const current = useNow();
  if (!date) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <time dateTime={date} title={formatDateTime(date)} className={className}>
      {timeAgo(date, current)}
    </time>
  );
}
