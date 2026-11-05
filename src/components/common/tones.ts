/**
 * Semantic status colours used by feature components (warnings, AI accents, internal notes).
 * Kept in one map so every light colour has a matching dark-mode variant, and the palette
 * can later be swapped for theme tokens in a single file.
 */
export const TONE_TEXT = {
  info: "text-sky-700 dark:text-sky-400",
  warn: "text-amber-700 dark:text-amber-400",
  /** Needs an owner / attention, e.g. "Unassigned". */
  attention: "text-orange-600 dark:text-orange-400",
  danger: "text-red-600 dark:text-red-400",
  ai: "text-violet-700 dark:text-violet-400",
} as const;

export type Tone = keyof typeof TONE_TEXT;

/** Soft callout surface (alerts, notices) per tone. */
export const TONE_CALLOUT = {
  warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
  /** Body text inside a warn callout (alert descriptions set their own muted colour). */
  warnBody: "text-amber-800 dark:text-amber-200",
  ai: "bg-violet-50/60 dark:bg-violet-950/30",
  /** Track behind the AI confidence bar. */
  aiTrack: "bg-violet-100 dark:bg-violet-400/15",
  /** AI-draft badge. */
  aiBadge:
    "border-0 bg-violet-50 text-violet-700 ring-1 ring-violet-200 ring-inset dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800",
} as const;

/** Ring that marks the AI reply card. */
export const AI_RING = "ring-violet-200 dark:ring-violet-900";

/** Internal-notes panel: deliberately "sticky note" yellow so it never reads as a reply. */
export const NOTE_CLASSES = {
  panel:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-50",
  item: "bg-amber-100/70 dark:bg-amber-900/30",
  muted: "text-amber-800 dark:text-amber-300",
  strong: "text-amber-950 dark:text-amber-50",
  icon: "text-amber-600 dark:text-amber-400",
  control: "border-amber-300 bg-background dark:border-amber-800",
} as const;

/** Solid fill for the AI confidence bar by confidence band. */
export const CONFIDENCE_BAR = {
  high: "bg-violet-600 dark:bg-violet-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
} as const;
