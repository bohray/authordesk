import "server-only";
import { TicketNote } from "../db/models";
import type { Id, TicketNoteRecord } from "./types";

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
