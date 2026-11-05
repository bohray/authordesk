import "server-only";
import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { ROLES } from "@/shared/constants/roles";
import {
  AI_STATUSES,
  CLASSIFICATION_SOURCES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/shared/constants/ticket";

/**
 * Author-visible conversation. Embedded because a ticket thread is small and bounded
 * and is always read together with its ticket. Internal notes deliberately live in a
 * SEPARATE collection (ticket_notes) so they can never leak through an author query.
 */
const messageSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ROLES, required: true },
    senderName: { type: String, required: true },
    body: { type: String, required: true },
    aiAssisted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true }, // T-1001
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", default: null }, // null = General / Account
    /** Denormalised so lists render without a join. */
    bookSnapshot: {
      type: new Schema({ title: String, isbn: String }, { _id: false }),
      default: null,
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    attachment: {
      type: new Schema({ name: String, size: Number, type: String }, { _id: false }),
      default: null,
    },
    status: { type: String, enum: TICKET_STATUSES, default: "OPEN" },

    category: { type: String, enum: [...TICKET_CATEGORIES, null], default: null },
    categorySource: { type: String, enum: [...CLASSIFICATION_SOURCES, null], default: null },
    priority: { type: String, enum: [...TICKET_PRIORITIES, null], default: null },
    prioritySource: { type: String, enum: [...CLASSIFICATION_SOURCES, null], default: null },
    /** CRITICAL=3 … LOW=0, -1 = not yet classified. Lets the queue sort by urgency via index. */
    priorityRank: { type: Number, default: -1 },

    ai: {
      status: { type: String, enum: AI_STATUSES, default: "PENDING" },
      confidence: { type: Number, default: null },
      reasoning: { type: String, default: null },
      model: { type: String, default: null },
      error: { type: String, default: null },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      /** Original AI suggestion, kept to measure override rate / accuracy. */
      suggestedCategory: { type: String, default: null },
      suggestedPriority: { type: String, default: null },
    },

    assigneeId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    messages: { type: [messageSchema], default: [] },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Admin queue: unresolved first, most urgent, oldest first.
ticketSchema.index({ status: 1, priorityRank: -1, createdAt: 1 });
ticketSchema.index({ authorId: 1, createdAt: -1 });
ticketSchema.index({ assigneeId: 1, status: 1 });
ticketSchema.index({ category: 1 });
// Polling delta endpoint (admins: all tickets; authors: own tickets only).
ticketSchema.index({ updatedAt: 1 });
ticketSchema.index({ authorId: 1, updatedAt: 1 });

export type TicketDoc = InferSchemaType<typeof ticketSchema> & { _id: Types.ObjectId };
export const Ticket: Model<InferSchemaType<typeof ticketSchema>> =
  models.Ticket ?? model("Ticket", ticketSchema);
