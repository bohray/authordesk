/**
 * Author ticket UI constants: list tabs, status hints, form copy and age badge colours.
 * Status values come from `@/shared/constants/ticket`.
 */
import type { TicketStatus } from "@/shared/constants/ticket";

export const authorTicketTabLabels = {
  all: "All",
  open: "Open",
  resolved: "Resolved",
} as const satisfies Record<AuthorTicketTab, string>;

/** Tabs in display order. */
export const authorTicketTabs = ["all", "open", "resolved"] as const;
export type AuthorTicketTab = (typeof authorTicketTabs)[number];

/** Narrows a Tabs `onValueChange` value without a cast. */
export function isAuthorTicketTab(value: unknown): value is AuthorTicketTab {
  return authorTicketTabs.some((tab) => tab === value);
}

/** Empty-state copy when a filtered tab has no tickets ("all" is handled by the page empty state). */
export const emptyTabText = {
  open: "You have no open tickets. Everything has been answered.",
  resolved: "No resolved tickets yet.",
} as const satisfies Record<Exclude<AuthorTicketTab, "all">, string>;

/** Characters of the last message shown under each ticket in the list. */
export const ticketPreviewChars = 180;

/** Banner under the ticket title explaining what happens next. */
export const ticketStatusHints = {
  OPEN: "We've received your ticket. A member of our team will reply here.",
  IN_PROGRESS: "Our team is working on this. New replies appear here automatically.",
  RESOLVED: "Marked resolved. Reply below if you still need help.",
  CLOSED: "This ticket is closed.",
} as const satisfies Record<TicketStatus, string>;

/** Sidebar tips on the new-ticket page. */
export const ticketTips = [
  "Pick the book your question is about so we can see its sales and royalty data.",
  "Include relevant dates, e.g. when you expected a payout or placed an order.",
  "Add order numbers, platform names (Amazon, Flipkart) or links where it applies.",
  "For printing issues, describe the defect and how many copies are affected.",
] as const;

/** New-ticket page grid: form + fixed-width tips column (shared with its skeleton). */
export const newTicketLayoutClass = "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]";

/** Shared height for the new-ticket form's inputs and submit button. */
export const ticketFormControlClass = "h-9";

export const newTicketCopy = {
  bookRequired: "Choose the book this is about, or General / Account Level",
  bookHint: "Choose General / Account Level for questions about your account, contract or payments overall.",
  bookPlaceholder: "Select a book",
  subjectPlaceholder: "e.g. Q2 royalty payout not received",
  descriptionHint: (min: number) =>
    `Include the book title, dates and any order numbers. Minimum ${min} characters.`,
  descriptionPlaceholder: "What happened, what you expected, and anything you've already tried.",
  fixFields: "Please fix the highlighted fields.",
  submitted: (ticketNumber: string) => `Ticket ${ticketNumber} submitted`,
} as const;

export const replyCopy = {
  placeholder: "Write a follow-up or answer a question from our team…",
  shortcutHint: "Ctrl/⌘ + Enter to send",
  sentAndReopened: "Reply sent, ticket reopened",
} as const;

/** Age badge colour by how long an unresolved ticket has waited (thresholds in `@/constants/ui`). */
export type TicketAgeLevel = "resolved" | "fresh" | "warn" | "danger";

export const ticketAgeBadgeClasses = {
  resolved: "bg-muted text-muted-foreground",
  fresh: "bg-muted text-foreground ring-1 ring-inset ring-border",
  warn: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25",
  danger:
    "bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/25 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/35",
} as const satisfies Record<TicketAgeLevel, string>;
