import "server-only";
/**
 * PUBLIC CONTRACT of the AI layer. Business services import ONLY from "@/server/ai".
 *
 * Guarantees (must hold for every implementation):
 *  - Never throws to callers. Failures are recorded on the ticket / returned as UNAVAILABLE.
 *  - Never blocks ticket creation: callers run `classifyTicket` inside `after()`.
 *
 * Implementation map:
 *  - classifier.service.ts  AI classification with rule-engine fallback
 *  - drafter.service.ts     cached, KB-grounded reply drafts
 *  - llmClient.ts          timeout / retry / provider fallback / circuit breaker / usage logging
 *  - context/buildFacts.ts all numbers & dates computed in code (never by the model)
 */
import type { DraftDTO } from "@/shared/types/dto";
import { classifyTicketImpl } from "./classifier.service";
import { getDraftForTicketImpl, unavailableDraft } from "./drafter.service";
import { hasConfiguredProvider } from "./llmClient";

/**
 * Classify a ticket's category + priority and persist the result on the ticket
 * (ai.status DONE, or FAILED with rule-based fallback values applied).
 * Skips silently if the ticket was already classified by an admin override.
 */
export async function classifyTicket(ticketId: string): Promise<void> {
  try {
    await classifyTicketImpl(ticketId);
  } catch {
    // classifyTicketImpl already guards itself; this is belt-and-braces for the contract.
  }
}

/**
 * Return the cached draft for a ticket, generating one if missing/stale or if
 * `regenerate` is true. Returns status "UNAVAILABLE" (content null) when AI is down.
 */
export async function getDraftForTicket(
  ticketId: string,
  opts: { regenerate?: boolean } = {},
): Promise<DraftDTO> {
  try {
    return await getDraftForTicketImpl(ticketId, opts);
  } catch {
    return unavailableDraft();
  }
}

/** True when at least one LLM provider has an API key (UI can hide the "Draft" button otherwise). */
export function isAiConfigured(): boolean {
  try {
    return hasConfiguredProvider();
  } catch {
    return false;
  }
}

/** Shared payout schedule maths (quarter end + 45 days), e.g. for MyBooksDTO.nextPayoutDate. */
export { getNextPayoutDate } from "./context/buildFacts";
export { payoutThresholdInr } from "./knowledge-base/publisher";
