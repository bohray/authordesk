import "server-only";
import { Types } from "mongoose";
import type { Role } from "@/shared/constants/roles";
import type { Session } from "../auth/session";
import type { NewTicketEvent } from "../repositories/ticketEvent.repository";
import type { Id, TicketMessageRecord } from "../repositories/types";

/**
 * Small builders shared by the author and admin ticket services, so every timeline event
 * and thread message is shaped the same way regardless of who wrote it.
 */

type EventActor = Pick<NewTicketEvent, "ticketId" | "actorId" | "actorName">;

/** The "who did it, on which ticket" part of a timeline event, taken from the session. */
export function eventActor(session: Session, ticketId: Id): EventActor {
  return { ticketId, actorId: session.userId, actorName: session.name };
}

/**
 * A new thread message from the signed-in user. The sender role is passed explicitly (not read
 * from the session) so each service states which side of the conversation it writes.
 */
export function newMessage(
  session: Session,
  senderRole: Role,
  body: string,
  options: { aiAssisted?: boolean; createdAt?: Date } = {},
): TicketMessageRecord {
  return {
    _id: new Types.ObjectId(),
    senderId: new Types.ObjectId(session.userId),
    senderRole,
    senderName: session.name,
    body,
    aiAssisted: options.aiAssisted ?? false,
    createdAt: options.createdAt ?? new Date(),
  };
}
