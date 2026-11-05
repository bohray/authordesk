import { z } from "zod";
import {
  defaultQueueSort,
  generalBookOption,
  queueAssigneeFilters,
  queueSorts,
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
} from "../constants/ticket";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

/** Author → create ticket. `bookId` is a Mongo id or "GENERAL" for account-level queries. */
export const createTicketSchema = z.object({
  bookId: z.union([objectId, z.literal(generalBookOption)]),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(150),
  description: z
    .string()
    .trim()
    .min(20, "Please describe the issue in at least 20 characters")
    .max(5000),
  /** UI-only attachment support: we store file metadata, not the file. */
  attachment: z
    .object({
      name: z.string().trim().min(1).max(255),
      size: z.number().int().nonnegative().max(10 * 1024 * 1024),
      type: z.string().max(100).optional(),
    })
    .optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** Author follow-up or admin reply. */
export const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(5000),
  /** Admin only: true when the reply started from an AI draft. Ignored for authors. */
  aiAssisted: z.boolean().optional(),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const createNoteSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty").max(5000),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/** Admin → partial update. `assigneeId: "me"` assigns to the caller, `null` unassigns. */
export const updateTicketSchema = z
  .object({
    status: z.enum(ticketStatuses).optional(),
    category: z.enum(ticketCategories).optional(),
    priority: z.enum(ticketPriorities).optional(),
    assigneeId: z.union([objectId, z.literal("me"), z.null()]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update",
  });
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .optional();

/** Admin queue filters (query string). Multi-value filters are comma-separated. */
export const adminTicketQuerySchema = z.object({
  status: csvEnum(ticketStatuses),
  category: csvEnum(ticketCategories),
  priority: csvEnum(ticketPriorities),
  assignee: z.union([z.enum(queueAssigneeFilters), objectId]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  q: z.string().trim().max(100).optional(),
  /** urgency = priority desc then oldest first (default); newest / oldest = by createdAt */
  sort: z.enum(queueSorts).default(defaultQueueSort),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminTicketQuery = z.infer<typeof adminTicketQuerySchema>;

/** Author "My tickets" pagination (newest first; authors rarely have many tickets). */
export const authorTicketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AuthorTicketQuery = z.infer<typeof authorTicketQuerySchema>;

export const updatesQuerySchema = z.object({
  since: z.iso.datetime({ offset: true }),
});

export const ticketIdParamSchema = z.object({ ticketId: objectId });
