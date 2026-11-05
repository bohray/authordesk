import "server-only";
import type { Types } from "mongoose";
import { User } from "../db/models";
import type { UserRecord } from "./types";

type Id = string | Types.ObjectId;

/** The only query that reads the password hash (it is `select: false` on the schema). */
export function findUserByEmailWithPassword(email: string) {
  return User.findOne({ email })
    .select("+passwordHash")
    .lean<(UserRecord & { passwordHash: string }) | null>();
}

export function findUserById(id: Id) {
  return User.findById(id).lean<UserRecord | null>();
}

export function findAdminById(id: Id) {
  return User.findOne({ _id: id, role: "ADMIN" }).lean<UserRecord | null>();
}

/** Batch lookup used by list views to avoid one query per row. */
export function findUsersByIds(ids: Id[]) {
  if (ids.length === 0) return Promise.resolve([] as Pick<UserRecord, "_id" | "name" | "email">[]);
  return User.find({ _id: { $in: ids } }, { name: 1, email: 1 }).lean<
    Pick<UserRecord, "_id" | "name" | "email">[]
  >();
}
