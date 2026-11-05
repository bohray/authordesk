import "server-only";
import type { UpdatesDTO } from "@/shared/types/dto";
import type { Session } from "../auth/session";
import { findTicketsUpdatedSince } from "../repositories/ticket.repository";

const MAX_CHANGES = 100;

/**
 * Polling delta for the "real-time" UI. Clients pass back `serverTime` as the next
 * `since`, so clock skew between browser and server never drops an update.
 */
export async function getUpdates(session: Session, since: Date): Promise<UpdatesDTO> {
  // Captured before querying: a write that lands during the query is picked up next poll
  // instead of falling between two windows.
  const serverTime = new Date();
  const rows = await findTicketsUpdatedSince(
    since,
    MAX_CHANGES,
    session.role === "AUTHOR" ? session.userId : undefined,
  );
  // When the page is full, more changes may remain: resume from the last row returned
  // (rows are sorted by updatedAt asc) instead of jumping ahead to now.
  // 1 ms earlier so rows sharing that exact timestamp aren't skipped (re-sending is harmless).
  const cursor =
    rows.length === MAX_CHANGES ? new Date(rows[rows.length - 1].updatedAt.getTime() - 1) : serverTime;
  return {
    serverTime: cursor.toISOString(),
    changed: rows.map((r) => ({ id: r._id.toString(), updatedAt: r.updatedAt.toISOString() })),
  };
}
