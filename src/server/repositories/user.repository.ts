import "server-only";
import { User } from "../db/models";
import type { Id, UserRecord } from "./types";

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
export function findUsersByIds(ids: Id[]) {
  if (ids.length === 0) return Promise.resolve([] as Pick<UserRecord, "_id" | "name" | "email">[]);
  return User.find({ _id: { $in: ids } }, { name: 1, email: 1 }).lean<
    Pick<UserRecord, "_id" | "name" | "email">[]
  >();
}

export type UserWithProfile = Pick<UserRecord, "_id" | "name" | "email" | "authorProfile">;

/**
 * One round trip for every user a ticket detail needs (author + assignee), with only the
 * fields the detail view shows.
 */
export function findUsersWithProfileByIds(ids: Id[]) {
  if (ids.length === 0) return Promise.resolve([] as UserWithProfile[]);
  return User.find({ _id: { $in: ids } }, { name: 1, email: 1, authorProfile: 1 }).lean<
    UserWithProfile[]
  >();
}
