const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

/** ₹ with Indian digit grouping, e.g. ₹1,23,456. Zero renders as ₹0. */
export function formatINR(amount: number | null | undefined): string {
  return inrFormatter.format(amount ?? 0);
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

/** 0..1 → "12%" */
export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  const v = (ratio ?? 0) * 100;
  return `${v.toFixed(digits)}%`;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Mar 2025" */
export function formatDate(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "12 Mar 2025, 3:45 pm" */
export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hoursSince(value: string | Date | null | undefined, now = Date.now()): number {
  const d = toDate(value);
  if (!d) return 0;
  return Math.max(0, (now - d.getTime()) / 3_600_000);
}

/** Compact age: "45m", "5h", "3d", "2mo". */
export function formatAge(value: string | Date | null | undefined, now = Date.now()): string {
  const d = toDate(value);
  if (!d) return "—";
  const mins = Math.max(0, Math.floor((now - d.getTime()) / 60_000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

/** "just now", "5 minutes ago", "3 days ago", falling back to a date after ~30 days. */
export function timeAgo(value: string | Date | null | undefined, now = Date.now()): string {
  const d = toDate(value);
  if (!d) return "—";
  const secs = Math.round((now - d.getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

const KB = 1024;
const MB = KB * 1024;

/** "512 B", "1.5 KB", "10 MB" (a trailing ".0" is dropped). */
export function formatBytes(bytes: number | null | undefined): string {
  const b = bytes ?? 0;
  if (b < KB) return `${b} B`;
  const [value, unit] = b < MB ? [b / KB, "KB"] : [b / MB, "MB"];
  return `${value.toFixed(1).replace(/\.0$/, "")} ${unit}`;
}

/** "1 book", "3 books". Pass `pluralWord` for irregular plurals. */
export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${formatNumber(count)} ${count === 1 ? word : pluralWord}`;
}

/** Label for tickets that aren't about a specific book. */
export const GENERAL_BOOK_LABEL = "General / Account Level";

/** Book title for a ticket, or the account-level label when no book is attached. */
export function bookLabel(book: { title: string } | null | undefined): string {
  return book?.title || GENERAL_BOOK_LABEL;
}

/** "In Production - Cover Design" → "In Production · Cover Design" */
export function formatBookStatus(status: string): string {
  return status.replace(/\s+-\s+/g, " · ");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
