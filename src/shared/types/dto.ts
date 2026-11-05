/**
 * API response contracts (JSON shapes returned by /api/v1).
 * Backend services MUST return these shapes; the frontend consumes them.
 * Dates are ISO strings on the wire.
 */
import type { Role } from "../constants/roles";
import type {
  AiStatus,
  ClassificationSource,
  TicketCategory,
  TicketEventType,
  TicketPriority,
  TicketStatus,
} from "../constants/ticket";

// ---------- envelopes ----------
export interface ApiSuccess<T> {
  data: T;
}
export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}
/** Every machine-readable error code the API can return (also drives the OpenAPI enum). */
export const errorCodes = [
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "AI_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof errorCodes)[number];

// ---------- auth ----------
export interface SessionUserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Present for authors, e.g. "AUTH001" */
  authorCode?: string;
}

// ---------- books ----------
export interface BookDTO {
  id: string;
  code: string; // BK001
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string; // "Published & Live" | "In Production - Cover Design" ...
  isPublished: boolean;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royalty: { earned: number; paid: number; pending: number; lastPayoutDate: string | null };
  printPartner: string | null;
  availableOn: string[];
}
export interface MyBooksDTO {
  books: BookDTO[];
  totals: { copiesSold: number; earned: number; paid: number; pending: number };
  /** Next scheduled payout date (quarter end + 45 days), ISO date */
  nextPayoutDate: string;
  payoutThreshold: number; // 1000
}

// ---------- tickets ----------
export interface TicketMessageDTO {
  id: string;
  senderRole: Role;
  senderName: string;
  body: string;
  aiAssisted: boolean;
  createdAt: string;
}

export interface TicketBookRefDTO {
  id: string;
  title: string;
  isbn: string;
}

/** What an AUTHOR sees. Never includes notes, drafts, AI internals or assignee details. */
export interface AuthorTicketDTO {
  id: string;
  ticketNumber: string; // T-1001
  subject: string;
  description: string;
  status: TicketStatus;
  book: TicketBookRefDTO | null; // null = General / Account Level
  attachment: { name: string; size: number } | null;
  messages: TicketMessageDTO[];
  createdAt: string;
  updatedAt: string;
}

/** Row in the admin queue. */
export interface AdminTicketListItemDTO {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  categorySource: ClassificationSource | null;
  priority: TicketPriority | null;
  prioritySource: ClassificationSource | null;
  aiStatus: AiStatus;
  author: { id: string; name: string; email: string };
  book: TicketBookRefDTO | null;
  assignee: { id: string; name: string } | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketNoteDTO {
  id: string;
  adminName: string;
  body: string;
  createdAt: string;
}

export interface TicketEventDTO {
  id: string;
  type: TicketEventType;
  actorName: string; // "System" for AI/system events
  from: string | null;
  to: string | null;
  createdAt: string;
}

/** Full admin ticket view. */
export interface AdminTicketDetailDTO extends AdminTicketListItemDTO {
  description: string;
  attachment: { name: string; size: number } | null;
  ai: {
    status: AiStatus;
    confidence: number | null;
    reasoning: string | null;
    model: string | null;
    error: string | null;
  };
  /** Author context panel */
  authorProfile: { code: string; phone: string; city: string; joinedDate: string } | null;
  bookDetails: BookDTO | null;
  messages: TicketMessageDTO[];
  notes: TicketNoteDTO[];
  events: TicketEventDTO[];
  firstResponseAt: string | null;
  resolvedAt: string | null;
}

// ---------- AI draft ----------
export interface DraftDTO {
  /** null when AI is unavailable: UI shows "write manually". */
  content: string | null;
  status: "READY" | "UNAVAILABLE";
  model: string | null;
  generatedAt: string | null;
  /** True if served from cache (no tokens spent). */
  cached: boolean;
  /** Human-readable reason when UNAVAILABLE. */
  message?: string;
}

// ---------- stats / updates ----------
export interface AdminStatsDTO {
  openByPriority: Record<TicketPriority | "UNCLASSIFIED", number>;
  byStatus: Record<TicketStatus, number>;
  unassigned: number;
  oldestOpenAt: string | null;
  ai: {
    calls: number;
    failures: number;
    fallbackRate: number; // 0..1 share of tickets classified by RULE
    inputTokens: number;
    outputTokens: number;
    overrideRate: number; // 0..1 share of AI classifications later overridden by admins
  };
}

export interface UpdatesDTO {
  /** Server time to pass as `since` on the next poll. */
  serverTime: string;
  changed: { id: string; updatedAt: string }[];
}

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
}
