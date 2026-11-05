/**
 * Domain enums shared by the API and the UI.
 * Keep values stable: they are persisted in MongoDB.
 */

export const ticketStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketStatusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** Statuses that still need ops attention (used for queue defaults + age badges). */
export const unresolvedStatuses: readonly TicketStatus[] = ["OPEN", "IN_PROGRESS"];

export const ticketCategories = [
  "ROYALTY_PAYMENTS",
  "ISBN_METADATA",
  "PRINTING_QUALITY",
  "DISTRIBUTION_AVAILABILITY",
  "BOOK_STATUS_PRODUCTION",
  "GENERAL_INQUIRY",
] as const;
export type TicketCategory = (typeof ticketCategories)[number];

export const ticketCategoryLabels: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata Issues",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution & Availability",
  BOOK_STATUS_PRODUCTION: "Book Status & Production Updates",
  GENERAL_INQUIRY: "General Inquiry",
};

export const ticketPriorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Numeric rank stored on the ticket so the queue can sort by urgency in one index. */
export const priorityRankByLevel: Record<TicketPriority, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

/** Where a category/priority value came from. ADMIN = human override. */
export const classificationSources = ["AI", "RULE", "ADMIN"] as const;
export type ClassificationSource = (typeof classificationSources)[number];

export const aiStatuses = ["PENDING", "DONE", "FAILED"] as const;
export type AiStatus = (typeof aiStatuses)[number];

export const ticketEventTypes = [
  "CREATED",
  "STATUS_CHANGED",
  "CATEGORY_CHANGED",
  "PRIORITY_CHANGED",
  "ASSIGNED",
  "AI_CLASSIFIED",
  "REPLIED",
  "NOTE_ADDED",
] as const;
export type TicketEventType = (typeof ticketEventTypes)[number];

/** Admin queue sort orders. urgency = unresolved first, priority desc, then oldest first. */
export const queueSorts = ["urgency", "newest", "oldest"] as const;
export type QueueSort = (typeof queueSorts)[number];
export const defaultQueueSort: QueueSort = "urgency";

/** Admin queue assignee filter values (besides "anyone", which is the absence of a filter). */
export const queueAssigneeFilters = ["me", "unassigned"] as const;
export type QueueAssignee = (typeof queueAssigneeFilters)[number];

/** Value used by the "which book" dropdown for account-level queries. */
export const generalBookOption = "GENERAL";
