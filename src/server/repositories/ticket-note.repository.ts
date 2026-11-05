import "server-only";
import type { Types } from "mongoose";
import { TicketNote } from "../db/models";
import type { TicketNoteRecord } from "./types";

type Id = string | Types.ObjectId;

export async function createNote(input: {
  ticketId: Id;
  adminId: Id;
  adminName: string;
  body: string;
}): Promise<TicketNoteRecord> {
  const doc = await TicketNote.create(input);
  return doc.toObject() as unknown as TicketNoteRecord;
}

export function listNotesForTicket(ticketId: Id) {
  return TicketNote.find({ ticketId }).sort({ createdAt: 1, _id: 1 }).lean<TicketNoteRecord[]>();
}
