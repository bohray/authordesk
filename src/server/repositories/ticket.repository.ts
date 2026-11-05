import "server-only";
import { Types, type PipelineStage, type UpdateQuery } from "mongoose";
import {
  unresolvedStatuses,
  type QueueSort,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/shared/constants/ticket";
import { Ticket } from "../db/models";
import type { Id, TicketQueueRecord, TicketRecord } from "./types";

const toObjectId = (id: Id) => (typeof id === "string" ? new Types.ObjectId(id) : id);

/** Stable "newest first" order; _id breaks ties between tickets created in the same ms. */
const newestFirst = { createdAt: -1, _id: -1 } as const;
const oldestFirst = { createdAt: 1, _id: 1 } as const;

/** Fields an author view needs. Admin-only data is excluded at the query level too. */
const authorProjection = {
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

export type AuthorTicketRecord = Pick<TicketRecord, keyof typeof authorProjection | "_id">;

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
  return Ticket.findOne({ _id: id, authorId }, authorProjection).lean<AuthorTicketRecord | null>();
}

export async function listTicketsForAuthor(authorId: Id, skip: number, limit: number) {
  const filter = { authorId };
  // Uses the { authorId, createdAt } index for both the page and the count.
  const [items, total] = await Promise.all([
    Ticket.find(filter, authorProjection)
      .sort(newestFirst)
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
  sort: QueueSort;
  skip: number;
  limit: number;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Fields the queue's free-text search matches against (case-insensitive substring). */
const searchableFields = ["subject", "ticketNumber", "description"] as const;

/**
 * Computed sort key: 0 for OPEN/IN_PROGRESS, 1 for RESOLVED/CLOSED, so live work comes first.
 * Never returned to callers.
 */
const resolvedSortKey = "_resolved";

/** Heavy fields a list view never shows, plus the computed sort key. */
const queueRowExclusions = { messages: 0, description: 0, [resolvedSortKey]: 0 } as const;

function buildQueueMatch(criteria: QueueCriteria): Record<string, unknown> {
  // Aggregation does not cast like find() does, so ids and dates must be real BSON types.
  const { statuses, categories, priorities, assigneeId, createdFrom, createdBefore, search } = criteria;
  const match: Record<string, unknown> = {};
  if (statuses?.length) match.status = { $in: statuses };
  if (categories?.length) match.category = { $in: categories };
  if (priorities?.length) match.priority = { $in: priorities };
  if (assigneeId !== undefined) match.assigneeId = assigneeId === null ? null : toObjectId(assigneeId);
  if (createdFrom || createdBefore) {
    match.createdAt = {
      ...(createdFrom ? { $gte: createdFrom } : {}),
      ...(createdBefore ? { $lt: createdBefore } : {}),
    };
  }
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    match.$or = searchableFields.map((field) => ({ [field]: pattern }));
  }
  return match;
}

/** Urgency order within one side (live or done). _id is the tiebreaker so pages are stable. */
const urgencySort = { priorityRank: -1, createdAt: 1, _id: 1 } as const;

const sortSpecs = {
  urgency: { [resolvedSortKey]: 1, ...urgencySort },
  newest: newestFirst,
  oldest: oldestFirst,
} satisfies Record<QueueSort, Record<string, 1 | -1>>;

/**
 * The `_resolved` sort key is only needed when the result can mix live and done tickets.
 * When the status filter is one-sided (e.g. the default "Open + In Progress" view) it would
 * be constant, and skipping the computed field lets Mongo sort with the
 * { status, priorityRank, createdAt } index instead of sorting every match in memory.
 */
function needsResolvedKey(statuses: TicketStatus[] | undefined): boolean {
  if (!statuses?.length) return true;
  const live = statuses.filter((status) => unresolvedStatuses.includes(status)).length;
  return live > 0 && live < statuses.length;
}

/** One aggregation returns the page and the total, already sorted by urgency rank. */
export async function queryAdminQueue(criteria: QueueCriteria) {
  const withResolvedKey = criteria.sort === "urgency" && needsResolvedKey(criteria.statuses);
  const sort = criteria.sort === "urgency" && !withResolvedKey ? urgencySort : sortSpecs[criteria.sort];
  const pipeline: PipelineStage[] = [
    { $match: buildQueueMatch(criteria) },
    ...(withResolvedKey
      ? [
          {
            $addFields: {
              [resolvedSortKey]: { $cond: [{ $in: ["$status", [...unresolvedStatuses]] }, 0, 1] },
            },
          },
        ]
      : []),
    { $sort: sort },
    {
      $facet: {
        items: [
          { $skip: criteria.skip },
          { $limit: criteria.limit },
          {
            // Don't ship message bodies/descriptions for a list view; compute the aggregates here.
            $addFields: {
              messageCount: { $size: "$messages" },
              lastMessageAt: { $ifNull: [{ $max: "$messages.createdAt" }, null] },
            },
          },
          { $project: queueRowExclusions },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];
  const [result] = await Ticket.aggregate<{ items: TicketQueueRecord[]; total: { n: number }[] }>(
    pipeline,
  );
  return { items: result?.items ?? [], total: result?.total[0]?.n ?? 0 };
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
  const unresolved = { status: { $in: [...unresolvedStatuses] } };
  const hasSuggestion = { $ne: [{ $ifNull: ["$ai.suggestedCategory", null] }, null] };
  const [stats] = await Ticket.aggregate<TicketStatsRaw>([
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
  return stats;
}
