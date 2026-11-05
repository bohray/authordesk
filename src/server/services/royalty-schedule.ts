import "server-only";
import { PAYOUT_THRESHOLD_INR, getNextPayoutDate } from "@/server/ai";

/**
 * Royalty payout schedule (quarter end + 45 days; payout dates May 15 / Aug 14 / Nov 14 /
 * Feb 14). The date math lives in the AI layer and is reused here so the author dashboard
 * and AI-drafted replies can never quote different payout dates.
 */
export const PAYOUT_THRESHOLD = PAYOUT_THRESHOLD_INR;

/** Next payout date on or after `today` (UTC calendar days), as an ISO date (YYYY-MM-DD). */
export function nextPayoutDate(today: Date = new Date()): string {
  return getNextPayoutDate(today).toISOString().slice(0, 10);
}
