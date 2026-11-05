import "server-only";
import type { Types } from "mongoose";
import type { TicketEventType } from "@/shared/constants/ticket";
import { TicketEvent } from "../db/models";
import type { TicketEventRecord } from "./types";

type Id = string | Types.ObjectId;

export interface NewTicketEvent {
  ticketId: Id;
  type: TicketEventType;
  actorId: Id | null;
  actorName: string;
  from?: string | null;
  to?: string | null;
}

export async function recordEvents(events: NewTicketEvent[]) {
  if (events.length === 0) return;
  await TicketEvent.insertMany(events.map((e) => ({ from: null, to: null, ...e })));
}

export function listEventsForTicket(ticketId: Id) {
  return TicketEvent.find({ ticketId }).sort({ createdAt: 1, _id: 1 }).lean<TicketEventRecord[]>();
}
