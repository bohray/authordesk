import "server-only";
import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { ticketEventTypes } from "@/shared/constants/ticket";

/* ------------------------------------------------------------------ */
/* Internal notes: admin-only, separate collection by design.          */
/* ------------------------------------------------------------------ */
const ticketNoteSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "ticket_notes" },
);
export type TicketNoteDoc = InferSchemaType<typeof ticketNoteSchema> & { _id: Types.ObjectId };
export const TicketNote: Model<InferSchemaType<typeof ticketNoteSchema>> =
  models.TicketNote ?? model("TicketNote", ticketNoteSchema);

/* ------------------------------------------------------------------ */
/* Cached AI drafts: one per ticket. Regenerated only on demand or     */
/* when the thread has grown since the draft was made (stale).         */
/* ------------------------------------------------------------------ */
const aiDraftSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, unique: true },
    content: { type: String, required: true },
    model: { type: String, required: true },
    provider: { type: String, required: true },
    promptVersion: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    /** ticket.messages.length when generated; if it grows, the draft is stale. */
    basedOnMessageCount: { type: Number, required: true },
  },
  { timestamps: true, collection: "ai_drafts" },
);
export type AiDraftDoc = InferSchemaType<typeof aiDraftSchema> & { _id: Types.ObjectId };
export const AiDraft: Model<InferSchemaType<typeof aiDraftSchema>> =
  models.AiDraft ?? model("AiDraft", aiDraftSchema);

/* ------------------------------------------------------------------ */
/* Audit trail: status changes, overrides, assignment, AI results.     */
/* ------------------------------------------------------------------ */
const ticketEventSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null = system/AI
    actorName: { type: String, default: "System" },
    type: { type: String, enum: ticketEventTypes, required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "ticket_events" },
);
export type TicketEventDoc = InferSchemaType<typeof ticketEventSchema> & { _id: Types.ObjectId };
export const TicketEvent: Model<InferSchemaType<typeof ticketEventSchema>> =
  models.TicketEvent ?? model("TicketEvent", ticketEventSchema);

/* ------------------------------------------------------------------ */
/* AI usage log: one row per LLM call (cost + reliability tracking).   */
/* ------------------------------------------------------------------ */
const aiUsageLogSchema = new Schema(
  {
    operation: { type: String, enum: ["CLASSIFY", "DRAFT"], required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", default: null },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    success: { type: Boolean, required: true },
    errorCode: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "ai_usage_logs" },
);
aiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
export type AiUsageLogDoc = InferSchemaType<typeof aiUsageLogSchema> & { _id: Types.ObjectId };
export const AiUsageLog: Model<InferSchemaType<typeof aiUsageLogSchema>> =
  models.AiUsageLog ?? model("AiUsageLog", aiUsageLogSchema);

/* ------------------------------------------------------------------ */
/* Atomic counters (ticket numbers).                                   */
/* ------------------------------------------------------------------ */
const counterSchema = new Schema(
  { _id: { type: String, required: true }, seq: { type: Number, default: 0 } },
  { collection: "counters", versionKey: false },
);
export const Counter: Model<{ _id: string; seq: number }> =
  models.Counter ?? model("Counter", counterSchema);

/** Atomic, race-free sequence: returns offset + 1, offset + 2, … */
export async function nextSequence(name: string, offset = 1000): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return offset + doc!.seq;
}

/* ------------------------------------------------------------------ */
/* Login attempts: rate limiting that works across serverless instances */
/* ------------------------------------------------------------------ */
const loginAttemptSchema = new Schema(
  {
    key: { type: String, required: true, index: true }, // email or ip
    createdAt: { type: Date, default: Date.now, expires: 15 * 60 },
  },
  { collection: "login_attempts", versionKey: false },
);
export const LoginAttempt: Model<{ key: string; createdAt: Date }> =
  models.LoginAttempt ?? model("LoginAttempt", loginAttemptSchema);
