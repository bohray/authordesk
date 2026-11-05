import "server-only";
import { Types, type PipelineStage, type UpdateQuery } from "mongoose";
import {
  UNRESOLVED_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/shared/constants/ticket";
import { Ticket } from "../db/models";
import type { Id, TicketQueueRecord, TicketRecord } from "./types";
const oid = (id: Id) => (typeof id === "string" ? new Types.ObjectId(id) : id);

/** Fields an author view needs. Admin-only data is excluded at the query level too. */
const AUTHOR_PROJECTION = {
  ticketNumber: 1,
  authorId: 1,
  bookId: 1,
  bookSnapshot: 1,
  subject: 1,
  description: 1,
  attachment: 1,
  status: 1,
  messages: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

export type AuthorTicketRecord = Pick<TicketRecord, keyof typeof AUTHOR_PROJECTION | "_id">;

export async function createTicket(data: Partial<TicketRecord>): Promise<TicketRecord> {
  const doc = await Ticket.create(data);
  return doc.toObject() as unknown as TicketRecord;
}

export function findTicketById(id: Id) {
  return Ticket.findById(id).lean<TicketRecord | null>();
}

export function ticketExists(id: Id) {
  return Ticket.exists({ _id: id });
}

/** Ownership-scoped: another author's ticket is indistinguishable from a missing one. */
export function findTicketForAuthor(id: Id, authorId: Id) {
  return Ticket.findOne({ _id: id, authorId }, AUTHOR_PROJECTION).lean<AuthorTicketRecord | null>();
}

export async function listTicketsForAuthor(authorId: Id, skip: number, limit: number) {
  const filter = { authorId };
  // Uses the { authorId, createdAt } index for both the page and the count.
  const [items, total] = await Promise.all([
    Ticket.find(filter, AUTHOR_PROJECTION)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean<AuthorTicketRecord[]>(),
    Ticket.countDocuments(filter),
  ]);
  return { items, total };
}

/**
 * Conditional update. `guard` lets callers make the write atomic with the check they
 * performed (e.g. "only if not CLOSED"); returns null when the guard no longer matches.
 */
export function updateTicket(
  id: Id,
  update: UpdateQuery<TicketRecord>,
  guard: Record<string, unknown> = {},
) {
  return Ticket.findOneAndUpdate({ _id: id, ...guard }, update, {
    returnDocument: "after",
  }).lean<TicketRecord | null>();
}

/** Bumps updatedAt so pollers (/updates) notice changes stored outside the ticket doc. */
export async function touchTicket(id: Id) {
  await Ticket.updateOne({ _id: id }, { $set: { updatedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Admin queue
// ---------------------------------------------------------------------------

export interface QueueCriteria {
  statuses?: TicketStatus[];
  categories?: TicketCategory[];
  priorities?: TicketPriority[];
  /** undefined = any, null = unassigned */
  assigneeId?: string | null;
  createdFrom?: Date;
  /** Exclusive upper bound. */
  createdBefore?: Date;
  search?: string;
  sort: "urgency" | "newest" | "oldest";
  skip: number;
  limit: number;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildQueueMatch(c: QueueCriteria): Record<string, unknown> {
  // Aggregation does not cast like find() does, so ids and dates must be real BSON types.
  const match: Record<string, unknown> = {};
  if (c.statuses?.length) match.status = { $in: c.statuses };
  if (c.categories?.length) match.category = { $in: c.categories };
  if (c.priorities?.length) match.priority = { $in: c.priorities };
  if (c.assigneeId !== undefined) match.assigneeId = c.assigneeId === null ? null : oid(c.assigneeId);
  if (c.createdFrom || c.createdBefore) {
    match.createdAt = {
      ...(c.createdFrom ? { $gte: c.createdFrom } : {}),
      ...(c.createdBefore ? { $lt: c.createdBefore } : {}),
    };
  }
  if (c.search) {
    const re = { $regex: escapeRegex(c.search), $options: "i" };
    match.$or = [{ subject: re }, { ticketNumber: re }, { description: re }];
  }
  return match;
}

/** Urgency order within one side (live or done). _id is the tiebreaker so pages are stable. */
const URGENCY_SORT = { priorityRank: -1, createdAt: 1, _id: 1 } as const;

const SORTS: Record<QueueCriteria["sort"], Record<string, 1 | -1>> = {
  // _resolved: 0 for OPEN/IN_PROGRESS, 1 for RESOLVED/CLOSED, so live work always comes first.
  urgency: { _resolved: 1, ...URGENCY_SORT },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
};

/**
 * The `_resolved` sort key is only needed when the result can mix live and done tickets.
 * When the status filter is one-sided (e.g. the default "Open + In Progress" view) it would
 * be constant, and skipping the computed field lets Mongo sort with the
 * { status, priorityRank, createdAt } index instead of sorting every match in memory.
 */
function needsResolvedKey(statuses: TicketStatus[] | undefined): boolean {
  if (!statuses?.length) return true;
  const live = statuses.filter((s) => UNRESOLVED_STATUSES.includes(s)).length;
  return live > 0 && live < statuses.length;
}

/** One aggregation returns the page and the total, already sorted by urgency rank. */
export async function queryAdminQueue(c: QueueCriteria) {
  const resolvedKey = c.sort === "urgency" && needsResolvedKey(c.statuses);
  const sort = c.sort === "urgency" && !resolvedKey ? URGENCY_SORT : SORTS[c.sort];
  const pipeline: PipelineStage[] = [
    { $match: buildQueueMatch(c) },
    ...(resolvedKey
      ? [
          {
            $addFields: {
              _resolved: { $cond: [{ $in: ["$status", [...UNRESOLVED_STATUSES]] }, 0, 1] },
            },
          },
        ]
      : []),
    { $sort: sort },
    {
      $facet: {
        items: [
          { $skip: c.skip },
          { $limit: c.limit },
          {
            // Don't ship message bodies/descriptions for a list view; compute the aggregates here.
            $addFields: {
              messageCount: { $size: "$messages" },
              lastMessageAt: { $ifNull: [{ $max: "$messages.createdAt" }, null] },
            },
          },
          { $project: { messages: 0, description: 0, _resolved: 0 } },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];
  const [res] = await Ticket.aggregate<{ items: TicketQueueRecord[]; total: { n: number }[] }>(
    pipeline,
  );
  return { items: res?.items ?? [], total: res?.total[0]?.n ?? 0 };
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

/** Cheap delta query: covered by the updatedAt index, returns only ids + timestamps. */
export function findTicketsUpdatedSince(since: Date, limit: number, authorId?: Id) {
  return Ticket.find(
    { updatedAt: { $gt: since }, ...(authorId ? { authorId } : {}) },
    { _id: 1, updatedAt: 1 },
  )
    .sort({ updatedAt: 1 })
    .limit(limit)
    .lean<{ _id: Types.ObjectId; updatedAt: Date }[]>();
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface TicketStatsRaw {
  byStatus: { _id: TicketStatus; n: number }[];
  openByPriority: { _id: TicketPriority | null; n: number }[];
  unassigned: { n: number }[];
  oldestOpen: { at: Date | null }[];
  classification: { classified: number; rule: number; suggested: number; overridden: number }[];
}

/** All ticket-side dashboard numbers in a single aggregation round trip. */
export async function getTicketStats(): Promise<TicketStatsRaw> {
  const unresolved = { status: { $in: [...UNRESOLVED_STATUSES] } };
  const hasSuggestion = { $ne: [{ $ifNull: ["$ai.suggestedCategory", null] }, null] };
  const [res] = await Ticket.aggregate<TicketStatsRaw>([
    {
      $facet: {
        byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
        openByPriority: [
          { $match: unresolved },
          { $group: { _id: { $ifNull: ["$priority", null] }, n: { $sum: 1 } } },
        ],
        unassigned: [{ $match: { ...unresolved, assigneeId: null } }, { $count: "n" }],
        oldestOpen: [{ $match: unresolved }, { $group: { _id: null, at: { $min: "$createdAt" } } }],
        classification: [
          {
            $group: {
              _id: null,
              classified: { $sum: { $cond: [{ $ne: ["$ai.status", "PENDING"] }, 1, 0] } },
              rule: { $sum: { $cond: [{ $eq: ["$categorySource", "RULE"] }, 1, 0] } },
              suggested: { $sum: { $cond: [hasSuggestion, 1, 0] } },
              overridden: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        hasSuggestion,
                        { $eq: ["$categorySource", "ADMIN"] },
                        { $ne: ["$category", "$ai.suggestedCategory"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ]);
  return res;
}
