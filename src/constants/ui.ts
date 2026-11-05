import type {
  ClassificationSource,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/shared/constants/ticket";

export const APP_NAME = "AuthorDesk";

/** Live updates poll cadence. */
export const POLL_INTERVAL_MS = 5000;
/** While AI classification is pending, refetch the ticket detail this often. */
export const AI_PENDING_REFETCH_MS = 3000;

export const PAGE_SIZE = 20;
/** Authors rarely have many tickets; we fetch a generous page and filter tabs client-side. */
export const AUTHOR_TICKETS_PAGE_SIZE = 50;

export const SEARCH_DEBOUNCE_MS = 350;

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const SUBJECT_MAX = 150;
export const DESCRIPTION_MAX = 5000;
export const MESSAGE_MAX = 5000;

/** Age thresholds for unresolved tickets (hours). */
export const AGE_WARN_HOURS = 24;
export const AGE_DANGER_HOURS = 48;

export const DEFAULT_PAYOUT_THRESHOLD = 1000;

export const STATUS_BADGE_CLASSES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  IN_PROGRESS: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

export const PRIORITY_BADGE_CLASSES: Record<TicketPriority | "UNCLASSIFIED", string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300",
  LOW: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  UNCLASSIFIED: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

/** Row emphasis for urgent unresolved tickets in the queue. */
export const PRIORITY_ROW_CLASSES: Partial<Record<TicketPriority, string>> = {
  CRITICAL: "bg-red-50/70 hover:bg-red-50 border-l-4 border-l-red-500",
  HIGH: "bg-orange-50/50 hover:bg-orange-50 border-l-4 border-l-orange-400",
};

export const CATEGORY_BADGE_CLASSES: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  ISBN_METADATA: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
  PRINTING_QUALITY: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200",
  DISTRIBUTION_AVAILABILITY: "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200",
  BOOK_STATUS_PRODUCTION: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  GENERAL_INQUIRY: "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200",
};

export const SOURCE_LABELS: Record<ClassificationSource, string> = {
  AI: "AI",
  RULE: "Rule",
  ADMIN: "Edited",
};

export const SOURCE_DESCRIPTIONS: Record<ClassificationSource, string> = {
  AI: "Set by AI classification",
  RULE: "Set by keyword rules (AI fallback)",
  ADMIN: "Edited by an admin",
};

export const SOURCE_BADGE_CLASSES: Record<ClassificationSource, string> = {
  AI: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  RULE: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  ADMIN: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
};

/** Solid colours for dots / bars (badges above are tinted backgrounds). */
export const PRIORITY_DOT_CLASSES: Record<TicketPriority | "UNCLASSIFIED", string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-slate-400",
  UNCLASSIFIED: "bg-slate-300",
};

export const STATUS_DOT_CLASSES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-violet-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-slate-400",
};
