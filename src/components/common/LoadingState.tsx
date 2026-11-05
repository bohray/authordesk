import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline progress indicators. Layout-matching skeletons for first loads live in
 * `skeletons.tsx`; these are for work happening on screen that is already rendered.
 */

/** Inline spinner with label. */
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

/**
 * Subtle "refreshing" hint shown while previous data stays on screen (filter / page change),
 * instead of blanking the list. Reserves its space so toggling it never shifts layout.
 */
export function UpdatingIndicator({ active, className }: { active: boolean; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex", className)}>
      <span
        aria-hidden={!active}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      >
        <Loader2 className={cn("size-3.5", active && "animate-spin")} aria-hidden />
        {active ? "Updating…" : <span className="invisible">Updating…</span>}
      </span>
    </span>
  );
}
