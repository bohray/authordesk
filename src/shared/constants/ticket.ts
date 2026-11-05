/**
 * Domain enums shared by the API and the UI.
 * Keep values stable: they are persisted in MongoDB.
 */

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** Statuses that still need ops attention (used for queue defaults + age badges). */
export const UNRESOLVED_STATUSES: readonly TicketStatus[] = ["OPEN", "IN_PROGRESS"];

export const TICKET_CATEGORIES = [
  "ROYALTY_PAYMENTS",
  "ISBN_METADATA",
  "PRINTING_QUALITY",
  "DISTRIBUTION_AVAILABILITY",
  "BOOK_STATUS_PRODUCTION",
  "GENERAL_INQUIRY",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata Issues",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution & Availability",
  BOOK_STATUS_PRODUCTION: "Book Status & Production Updates",
  GENERAL_INQUIRY: "General Inquiry",
};

export const TICKET_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Numeric rank stored on the ticket so the queue can sort by urgency in one index. */
export const PRIORITY_RANK: Record<TicketPriority, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

/** Where a category/priority value came from. ADMIN = human override. */
export const CLASSIFICATION_SOURCES = ["AI", "RULE", "ADMIN"] as const;
export type ClassificationSource = (typeof CLASSIFICATION_SOURCES)[number];

export const AI_STATUSES = ["PENDING", "DONE", "FAILED"] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

export const TICKET_EVENT_TYPES = [
  "CREATED",
  "STATUS_CHANGED",
  "CATEGORY_CHANGED",
  "PRIORITY_CHANGED",
  "ASSIGNED",
  "AI_CLASSIFIED",
  "REPLIED",
  "NOTE_ADDED",
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

/** Admin queue sort orders. urgency = unresolved first, priority desc, then oldest first. */
export const QUEUE_SORTS = ["urgency", "newest", "oldest"] as const;
export type QueueSort = (typeof QUEUE_SORTS)[number];
export const DEFAULT_QUEUE_SORT: QueueSort = "urgency";

/** Admin queue assignee filter values (besides "anyone", which is the absence of a filter). */
export const QUEUE_ASSIGNEE_FILTERS = ["me", "unassigned"] as const;
export type QueueAssignee = (typeof QUEUE_ASSIGNEE_FILTERS)[number];

/** Value used by the "which book" dropdown for account-level queries. */
export const GENERAL_BOOK_OPTION = "GENERAL";
