import type {
  ClassificationSource,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/shared/constants/ticket";

export const appName = "AuthorDesk";

/** Live updates poll cadence. */
export const pollIntervalMs = 5000;
/** While AI classification is pending, refetch the ticket detail this often. */
export const aiPendingRefetchMs = 3000;

export const pageSize = 20;
/** Authors rarely have many tickets; we fetch a generous page and filter tabs client-side. */
export const authorTicketsPageSize = 50;

export const searchDebounceMs = 350;

export const maxAttachmentBytes = 10 * 1024 * 1024;
export const subjectMax = 150;
export const descriptionMax = 5000;
export const messageMax = 5000;

/** Age thresholds for unresolved tickets (hours). */
export const ageWarnHours = 24;
export const ageDangerHours = 48;

export const defaultPayoutThreshold = 1000;

/*
 * Badge tones: soft tint + strong text + subtle inset ring, each with a dark variant.
 * Light: -50/-100 bg, -700/-800 text (≥4.5:1). Dark: -400 at low alpha bg, -200/-300 text.
 */
const tone = {
  blue: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-200 dark:ring-blue-400/30",
  violet:
    "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/30",
  green:
    "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25",
  neutral:
    "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-500/20 dark:bg-stone-400/10 dark:text-stone-300 dark:ring-stone-400/20",
  slate:
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/25",
  red: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/30 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/40",
  orange:
    "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-600/25 dark:bg-orange-400/10 dark:text-orange-200 dark:ring-orange-400/30",
  amber:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25",
  teal: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-200 dark:ring-teal-400/25",
  sky: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/25",
  rose: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/25",
  indigo:
    "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-400/30",
} as const;

export const statusBadgeClasses: Record<TicketStatus, string> = {
  OPEN: tone.blue,
  IN_PROGRESS: tone.violet,
  RESOLVED: tone.green,
  CLOSED: tone.neutral,
};

export const priorityBadgeClasses: Record<TicketPriority | "UNCLASSIFIED", string> = {
  CRITICAL: `${tone.red} font-semibold`,
  HIGH: tone.orange,
  MEDIUM: tone.amber,
  LOW: tone.slate,
  UNCLASSIFIED: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

/** Row emphasis for urgent unresolved tickets in the queue. */
export const priorityRowClasses: Partial<Record<TicketPriority, string>> = {
  CRITICAL:
    "bg-red-50/60 hover:bg-red-50 border-l-4 border-l-red-500 dark:bg-red-500/8 dark:hover:bg-red-500/12 dark:border-l-red-400",
  HIGH: "bg-orange-50/40 hover:bg-orange-50/80 border-l-4 border-l-orange-400 dark:bg-orange-400/5 dark:hover:bg-orange-400/10 dark:border-l-orange-400/80",
};

export const categoryBadgeClasses: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: tone.green,
  ISBN_METADATA: tone.sky,
  PRINTING_QUALITY: tone.rose,
  DISTRIBUTION_AVAILABILITY: tone.indigo,
  BOOK_STATUS_PRODUCTION: tone.amber,
  GENERAL_INQUIRY: tone.neutral,
};

export const sourceLabels: Record<ClassificationSource, string> = {
  AI: "AI",
  RULE: "Rule",
  ADMIN: "Edited",
};

export const sourceDescriptions: Record<ClassificationSource, string> = {
  AI: "Set by AI classification",
  RULE: "Set by keyword rules (AI fallback)",
  ADMIN: "Edited by an admin",
};

export const sourceBadgeClasses: Record<ClassificationSource, string> = {
  AI: tone.violet,
  RULE: tone.slate,
  ADMIN: tone.teal,
};

/** Solid colours for dots / bars (badges above are tinted backgrounds). */
export const priorityDotClasses: Record<TicketPriority | "UNCLASSIFIED", string> = {
  CRITICAL: "bg-red-600 dark:bg-red-400",
  HIGH: "bg-orange-500 dark:bg-orange-400",
  MEDIUM: "bg-amber-400 dark:bg-amber-300",
  LOW: "bg-slate-400 dark:bg-slate-500",
  UNCLASSIFIED: "bg-slate-300 dark:bg-slate-600",
};

export const statusDotClasses: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500 dark:bg-blue-400",
  IN_PROGRESS: "bg-violet-500 dark:bg-violet-400",
  RESOLVED: "bg-emerald-500 dark:bg-emerald-400",
  CLOSED: "bg-stone-400 dark:bg-stone-500",
};
