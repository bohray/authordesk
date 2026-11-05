/**
 * Admin ticket detail UI constants: select options, thresholds, icons and copy.
 * Domain values come from `@/shared/constants/ticket`, so options always match the API enums.
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CirclePlus,
  Flag,
  MessageSquare,
  Sparkles,
  StickyNote,
  Tag,
  UserCheck,
} from "lucide-react";
import {
  ticketCategories,
  ticketCategoryLabels,
  ticketPriorities,
  ticketPriorityLabels,
  ticketStatuses,
  ticketStatusLabels,
  type TicketEventType,
} from "@/shared/constants/ticket";
import type { FilterOption } from "@/constants/queue";

export const ticketStatusOptions: FilterOption[] = ticketStatuses.map((s) => ({
  value: s,
  label: ticketStatusLabels[s],
}));

export const ticketCategoryOptions: FilterOption[] = ticketCategories.map((c) => ({
  value: c,
  label: ticketCategoryLabels[c],
}));

export const ticketPriorityOptions: FilterOption[] = ticketPriorities.map((p) => ({
  value: p,
  label: ticketPriorityLabels[p],
}));

/** Shown wherever a ticket is waiting on AI classification. */
export const classifyingLabel = "Classifying…";

/** AI confidence (0..1) at or above which the bar turns medium / high. */
export const confidenceThresholds = { high: 0.75, medium: 0.5 } as const;

/** Activity timeline icon per event type. Exhaustive, so a new event type is a compile error. */
export const ticketEventIcons = {
  CREATED: CirclePlus,
  STATUS_CHANGED: ArrowRightLeft,
  CATEGORY_CHANGED: Tag,
  PRIORITY_CHANGED: Flag,
  ASSIGNED: UserCheck,
  AI_CLASSIFIED: Sparkles,
  REPLIED: MessageSquare,
  NOTE_ADDED: StickyNote,
} satisfies Record<TicketEventType, LucideIcon>;

/** Toasts shown after a ticket PATCH succeeds. */
export const ticketUpdateMessages = {
  status: (label: string) => `Status changed to ${label}`,
  category: (label: string) => `Category set to ${label}`,
  priority: (label: string) => `Priority set to ${label}`,
  closed: "Ticket closed",
  resolved: "Ticket marked resolved",
  assigned: "Assigned to you",
  unassigned: "Ticket unassigned",
} as const;

export const closeTicketDialog = {
  title: "Close this ticket?",
  description:
    "The author won't be able to reply to a closed ticket. Use Resolved if they might still follow up.",
  confirmLabel: "Close ticket",
} as const;

export const regenerateDraftDialog = {
  title: "Replace your edits?",
  description: "Regenerating replaces the text in the editor with a new AI draft.",
  confirmLabel: "Regenerate",
} as const;

/** Copy for the admin reply composer. */
export const replyComposerCopy = {
  closedNotice: "This ticket is closed. Reopen it (set status to Open or In Progress) to reply.",
  unavailableTitle: "AI draft unavailable",
  unavailableSuffix: "You can write a manual reply below.",
  manualPlaceholder: "Write your reply to the author…",
  draftPlaceholder: "The AI draft will appear here.",
  emptyError: "Message cannot be empty",
  hintFromDraft:
    "Review and edit before sending. Check facts like dates and amounts against the book card.",
  hintOpenTicket: "Sending a reply moves the ticket to In Progress.",
  hintDefault: "The author sees this reply immediately.",
  badgeCached: "AI draft · cached",
  badgeFresh: "AI draft · freshly generated",
} as const;
