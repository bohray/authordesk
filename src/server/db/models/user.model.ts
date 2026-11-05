import "server-only";
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "@/shared/constants/roles";

/** Author profile is embedded: strictly 1:1 with the user and always read together. */
const authorProfileSchema = new Schema(
  {
    code: { type: String, required: true }, // AUTH001
    phone: { type: String, default: "" },
    city: { type: String, default: "" },
    joinedDate: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    authorProfile: { type: authorProfileSchema, default: undefined },
  },
  { timestamps: true },
);

userSchema.index({ "authorProfile.code": 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: import("mongoose").Types.ObjectId };
export const User: Model<InferSchemaType<typeof userSchema>> =
  models.User ?? model("User", userSchema);
