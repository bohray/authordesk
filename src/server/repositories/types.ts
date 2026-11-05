import "server-only";
import type { Types } from "mongoose";
import type { Role } from "@/shared/constants/roles";
import type {
  AiStatus,
  ClassificationSource,
  TicketCategory,
  TicketEventType,
  TicketPriority,
  TicketStatus,
} from "@/shared/constants/ticket";

/**
 * Plain (lean) record shapes returned by repositories. Declared explicitly instead of
 * relying on Mongoose's inferred document types so services and mappers work with
 * simple, predictable objects and never touch hydrated documents.
 */

export interface UserRecord {
  _id: Types.ObjectId;
  email: string;
  name: string;
  role: Role;
  authorProfile?: { code: string; phone: string; city: string; joinedDate: Date } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookRecord {
  _id: Types.ObjectId;
  code: string;
  authorId: Types.ObjectId;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: Date | null;
  status: string;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royalty: { earned: number; paid: number; pending: number; lastPayoutDate: Date | null };
  printPartner: string | null;
  availableOn: string[];
}

export interface TicketMessageRecord {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: Role;
  senderName: string;
  body: string;
  aiAssisted: boolean;
  createdAt: Date;
}

export interface TicketAiRecord {
  status: AiStatus;
  confidence: number | null;
  reasoning: string | null;
  model: string | null;
  error: string | null;
  attempts: number;
  lastAttemptAt: Date | null;
  suggestedCategory: string | null;
  suggestedPriority: string | null;
}

export interface TicketRecord {
  _id: Types.ObjectId;
  ticketNumber: string;
  authorId: Types.ObjectId;
  bookId: Types.ObjectId | null;
  bookSnapshot: { title: string; isbn: string } | null;
  subject: string;
  description: string;
  attachment: { name: string; size: number; type?: string } | null;
  status: TicketStatus;
  category: TicketCategory | null;
  categorySource: ClassificationSource | null;
  priority: TicketPriority | null;
  prioritySource: ClassificationSource | null;
  priorityRank: number;
  ai: TicketAiRecord;
  assigneeId: Types.ObjectId | null;
  messages: TicketMessageRecord[];
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Admin queue row: the ticket minus heavy fields, plus aggregates computed in Mongo. */
export type TicketQueueRecord = Omit<TicketRecord, "messages" | "description"> & {
  messageCount: number;
  lastMessageAt: Date | null;
};

export interface TicketNoteRecord {
  _id: Types.ObjectId;
  ticketId: Types.ObjectId;
  adminId: Types.ObjectId;
  adminName: string;
  body: string;
  createdAt: Date;
}

export interface TicketEventRecord {
  _id: Types.ObjectId;
  ticketId: Types.ObjectId;
  actorId: Types.ObjectId | null;
  actorName: string;
  type: TicketEventType;
  from: string | null;
  to: string | null;
  createdAt: Date;
}
