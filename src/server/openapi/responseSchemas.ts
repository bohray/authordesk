import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { userRoles } from "@/shared/constants/roles";
import {
  aiStatuses,
  classificationSources,
  ticketCategories,
  ticketEventTypes,
  ticketPriorities,
  ticketStatuses,
} from "@/shared/constants/ticket";
import type {
  AdminStatsDTO,
  AdminTicketDetailDTO,
  AdminTicketListItemDTO,
  ApiErrorBody,
  AuthorTicketDTO,
  BookDTO,
  DraftDTO,
  MyBooksDTO,
  SessionUserDTO,
  TicketNoteDTO,
  UpdatesDTO,
} from "@/shared/types/dto";

/**
 * Zod mirrors of the response DTOs in src/shared/types/dto.ts, used only to document the
 * API. The `Same<>` checks at the bottom make `tsc` fail if a DTO and its schema drift.
 */

// Must run before the schemas below are created: Zod 4 instances only pick up `.openapi()`
// (needed by registry.register) if it exists when they are constructed.
extendZodWithOpenApi(z);

const isoDateTime = z.string().meta({ format: "date-time" });
const id = z.string().meta({ example: "665f1c2e8b3e4a0012345678" });

export const ErrorBodySchema = z.object({
  error: z.object({
    code: z.enum([
      "BAD_REQUEST",
      "VALIDATION_ERROR",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "RATE_LIMITED",
      "AI_UNAVAILABLE",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const SessionUserSchema = z.object({
  id,
  email: z.string(),
  name: z.string(),
  role: z.enum(userRoles),
  authorCode: z.string().optional(),
});

export const BookSchema = z.object({
  id,
  code: z.string().meta({ example: "BK001" }),
  title: z.string(),
  isbn: z.string(),
  genre: z.string(),
  publicationDate: isoDateTime.nullable(),
  status: z.string().meta({ example: "Published & Live" }),
  isPublished: z.boolean(),
  mrp: z.number().nullable(),
  royaltyPerCopy: z.number().nullable(),
  copiesSold: z.number(),
  royalty: z.object({
    earned: z.number(),
    paid: z.number(),
    pending: z.number(),
    lastPayoutDate: isoDateTime.nullable(),
  }),
  printPartner: z.string().nullable(),
  availableOn: z.array(z.string()),
});

export const MyBooksSchema = z.object({
  books: z.array(BookSchema),
  totals: z.object({ copiesSold: z.number(), earned: z.number(), paid: z.number(), pending: z.number() }),
  nextPayoutDate: z.string().meta({ format: "date", example: "2026-11-14" }),
  payoutThreshold: z.number().meta({ example: 1000 }),
});

const MessageSchema = z.object({
  id,
  senderRole: z.enum(userRoles),
  senderName: z.string(),
  body: z.string(),
  aiAssisted: z.boolean(),
  createdAt: isoDateTime,
});

const BookRefSchema = z.object({ id, title: z.string(), isbn: z.string() });
const AttachmentSchema = z.object({ name: z.string(), size: z.number() });

export const AuthorTicketSchema = z.object({
  id,
  ticketNumber: z.string().meta({ example: "T-1001" }),
  subject: z.string(),
  description: z.string(),
  status: z.enum(ticketStatuses),
  book: BookRefSchema.nullable(),
  attachment: AttachmentSchema.nullable(),
  messages: z.array(MessageSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const AdminTicketListItemSchema = z.object({
  id,
  ticketNumber: z.string(),
  subject: z.string(),
  status: z.enum(ticketStatuses),
  category: z.enum(ticketCategories).nullable(),
  categorySource: z.enum(classificationSources).nullable(),
  priority: z.enum(ticketPriorities).nullable(),
  prioritySource: z.enum(classificationSources).nullable(),
  aiStatus: z.enum(aiStatuses),
  author: z.object({ id, name: z.string(), email: z.string() }),
  book: BookRefSchema.nullable(),
  assignee: z.object({ id, name: z.string() }).nullable(),
  messageCount: z.number().int(),
  lastMessageAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const TicketNoteSchema = z.object({
  id,
  adminName: z.string(),
  body: z.string(),
  createdAt: isoDateTime,
});

const TicketEventSchema = z.object({
  id,
  type: z.enum(ticketEventTypes),
  actorName: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  createdAt: isoDateTime,
});

export const AdminTicketDetailSchema = AdminTicketListItemSchema.extend({
  description: z.string(),
  attachment: AttachmentSchema.nullable(),
  ai: z.object({
    status: z.enum(aiStatuses),
    confidence: z.number().nullable(),
    reasoning: z.string().nullable(),
    model: z.string().nullable(),
    error: z.string().nullable(),
  }),
  authorProfile: z
    .object({ code: z.string(), phone: z.string(), city: z.string(), joinedDate: isoDateTime })
    .nullable(),
  bookDetails: BookSchema.nullable(),
  messages: z.array(MessageSchema),
  notes: z.array(TicketNoteSchema),
  events: z.array(TicketEventSchema),
  firstResponseAt: isoDateTime.nullable(),
  resolvedAt: isoDateTime.nullable(),
});

export const DraftSchema = z.object({
  content: z.string().nullable(),
  status: z.enum(["READY", "UNAVAILABLE"]),
  model: z.string().nullable(),
  generatedAt: isoDateTime.nullable(),
  cached: z.boolean(),
  message: z.string().optional(),
});

const count = z.number().int();
export const AdminStatsSchema = z.object({
  openByPriority: z.object({ CRITICAL: count, HIGH: count, MEDIUM: count, LOW: count, UNCLASSIFIED: count }),
  byStatus: z.object({ OPEN: count, IN_PROGRESS: count, RESOLVED: count, CLOSED: count }),
  unassigned: count,
  oldestOpenAt: isoDateTime.nullable(),
  ai: z.object({
    calls: count,
    failures: count,
    fallbackRate: z.number().min(0).max(1),
    inputTokens: count,
    outputTokens: count,
    overrideRate: z.number().min(0).max(1),
  }),
});

export const UpdatesSchema = z.object({
  serverTime: isoDateTime,
  changed: z.array(z.object({ id, updatedAt: isoDateTime })),
});

export const PaginationMetaSchema = z.object({
  page: count,
  limit: count,
  total: count,
  totalPages: count,
});

// ---- compile-time drift guards ------------------------------------------------
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type _SchemaContractChecks = [
  Assert<Same<z.infer<typeof ErrorBodySchema>["error"]["code"], ApiErrorBody["error"]["code"]>>,
  Assert<Same<z.infer<typeof SessionUserSchema>, SessionUserDTO>>,
  Assert<Same<z.infer<typeof BookSchema>, BookDTO>>,
  Assert<Same<z.infer<typeof MyBooksSchema>, MyBooksDTO>>,
  Assert<Same<z.infer<typeof AuthorTicketSchema>, AuthorTicketDTO>>,
  Assert<Same<z.infer<typeof AdminTicketListItemSchema>, AdminTicketListItemDTO>>,
  Assert<Same<z.infer<typeof AdminTicketDetailSchema>, AdminTicketDetailDTO>>,
  Assert<Same<z.infer<typeof TicketNoteSchema>, TicketNoteDTO>>,
  Assert<Same<z.infer<typeof DraftSchema>, DraftDTO>>,
  Assert<Same<z.infer<typeof AdminStatsSchema>, AdminStatsDTO>>,
  Assert<Same<z.infer<typeof UpdatesSchema>, UpdatesDTO>>,
];
