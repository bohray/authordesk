import "server-only";
/**
 * PUBLIC CONTRACT of the AI layer. Business services import ONLY from "@/server/ai".
 *
 * Guarantees (must hold for every implementation):
 *  - Never throws to callers. Failures are recorded on the ticket / returned as UNAVAILABLE.
 *  - Never blocks ticket creation: callers run `classifyTicket` inside `after()`.
 *
 * TEMPORARY STUB: replaced by the AI-layer implementation.
 */
import type { DraftDTO } from "@/shared/types/dto";

/**
 * Classify a ticket's category + priority and persist the result on the ticket
 * (ai.status DONE, or FAILED with rule-based fallback values applied).
 * Skips silently if the ticket was already classified by an admin override.
 */
export async function classifyTicket(ticketId: string): Promise<void> {
  void ticketId;
}

/**
 * Return the cached draft for a ticket, generating one if missing/stale or if
 * `regenerate` is true. Returns status "UNAVAILABLE" (content null) when AI is down.
 */
export async function getDraftForTicket(
  ticketId: string,
  opts: { regenerate?: boolean } = {},
): Promise<DraftDTO> {
  void ticketId;
  void opts;
  return {
    content: null,
    status: "UNAVAILABLE",
    model: null,
    generatedAt: null,
    cached: false,
    message: "AI drafting is not configured yet.",
  };
}
