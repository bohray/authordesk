import "server-only";
import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

/**
 * Books live in their own collection (queried per author, referenced by tickets).
 * Nullable fields model books still in production (no MRP / publication date yet).
 */
const bookSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // BK001
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    isbn: { type: String, required: true },
    genre: { type: String, required: true },
    publicationDate: { type: Date, default: null },
    status: { type: String, required: true },
    mrp: { type: Number, default: null },
    royaltyPerCopy: { type: Number, default: null },
    copiesSold: { type: Number, default: 0 },
    royalty: {
      earned: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      lastPayoutDate: { type: Date, default: null },
    },
    printPartner: { type: String, default: null },
    availableOn: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type BookDoc = InferSchemaType<typeof bookSchema> & { _id: Types.ObjectId };
export const Book: Model<InferSchemaType<typeof bookSchema>> =
  models.Book ?? model("Book", bookSchema);
