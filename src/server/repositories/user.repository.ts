import "server-only";
import { User } from "../db/models";
import type { Id, UserRecord, UserSummary, UserWithProfile } from "./types";

export type { UserWithProfile } from "./types";

const summaryProjection = { name: 1, email: 1 } as const;
const withProfileProjection = { ...summaryProjection, authorProfile: 1 } as const;

/** The only query that reads the password hash (it is `select: false` on the schema). */
export function findUserByEmailWithPassword(email: string) {
  return User.findOne({ email })
    .select("+passwordHash")
    .lean<(UserRecord & { passwordHash: string }) | null>();
}

export function findUserById(id: Id) {
  return User.findById(id).lean<UserRecord | null>();
}

/** Existence + name check for assignment; only the name is read. */
export function findAdminById(id: Id) {
  return User.findOne({ _id: id, role: "ADMIN" }, { name: 1 }).lean<Pick<UserRecord, "_id" | "name"> | null>();
}

/** Batch lookup used by list views to avoid one query per row. */
export async function findUsersByIds(ids: Id[]): Promise<UserSummary[]> {
  if (ids.length === 0) return [];
  return User.find({ _id: { $in: ids } }, summaryProjection).lean<UserSummary[]>();
}

/**
 * One round trip for every user a ticket detail needs (author + assignee), with only the
 * fields the detail view shows.
 */
export async function findUsersWithProfileByIds(ids: Id[]): Promise<UserWithProfile[]> {
  if (ids.length === 0) return [];
  return User.find({ _id: { $in: ids } }, withProfileProjection).lean<UserWithProfile[]>();
}
