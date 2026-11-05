import type { TicketCategory, TicketPriority } from "@/shared/constants/ticket";
import { ticketPriorities } from "@/shared/constants/ticket";
import { formatINR, type RoyaltyFacts } from "./context/buildFacts";
import { payoutThresholdInr } from "./knowledge-base/publisher";

/**
 * Deterministic fallback classifier. Runs with zero cost and zero dependencies, so the admin
 * queue is ALWAYS sorted and categorised, even with no API keys or every provider down.
 * Confidence is capped well below AI levels so the UI / metrics can tell them apart.
 */
export const ruleEngineModel = "rule-engine-v1";

export interface RuleClassification {
  category: TicketCategory;
  priority: TicketPriority;
  confidence: number;
  reasoning: string;
}

type Pattern = [RegExp, number];

const categoryPatterns: Record<TicketCategory, Pattern[]> = {
  ROYALTY_PAYMENTS: [
    [/royalt/i, 4],
    [/payout|pay ?ment|\bpaid\b|\bpay\b|earning|bank (transfer|account|details)|statement/i, 2],
    [/₹|\brs\.?\s?\d|\binr\b|money|amount/i, 1],
    [/commission|net profit|breakdown|calculat/i, 1],
  ],
  ISBN_METADATA: [
    [/\bisbn\b/i, 6],
    [/wrong (book|author|title|name)|duplicate|imprint|barcode|metadata (error|issue|wrong)/i, 3],
  ],
  PRINTING_QUALITY: [
    [/misprint|blurr?y|misalign|binding|smudge|faded|torn|ink\b|colou?r (issue|inconsisten|wrong)|pages? (missing|out of order|loose|upside)/i, 4],
    [/print(ing|ed)?|reprint|author cop(y|ies)|defect|damaged|quality/i, 2],
  ],
  DISTRIBUTION_AVAILABILITY: [
    [/unavailable|not available|out of stock|can'?t (find|buy)|cannot (find|buy)|not (showing|listed|visible)|listing/i, 4],
    [/amazon|flipkart|store|\bsync\b|go(ne)? live|platform/i, 1],
  ],
  BOOK_STATUS_PRODUCTION: [
    [/typesetting|cover design|proofread|editing stage|manuscript|in production|production (stage|status)/i, 4],
    [/stuck|stage|delay|when will (my|the) book|still (in|showing)|timeline|proof/i, 2],
  ],
  GENERAL_INQUIRY: [
    [/how (do|can) i|can i|is it possible|where (do|can) i/i, 2],
    [/\bbio\b|description|blurb|keywords?|account|password|login|package|dashboard|contact/i, 2],
  ],
};

const urgency = /\burgent\b|\basap\b|immediately|\blegal\b|lawyer|\bmonths\b|\bnever\b|unacceptable|\bfraud\b|\bscam\b/i;
const legalOrRights = /\blegal action\b|\blawyer\b|\bsue\b|\bcourt\b|copyright|plagiari|breach of contract|rights (issue|violation)/i;
const notReceived = /(haven'?t|have not|not|never|didn'?t|did not|yet to) (been )?(receiv|got|gotten|paid|credited)|no royalt|without (any )?(payment|royalt)/i;
const neverOrLong = /\bnever\b|\byear\b|\b([4-9]|1\d) months\b|\b(six|seven|eight|nine|ten|twelve) months\b|quarters/i;
const calcQuestion = /calculat|breakdown|too low|seems low|looks low|only (got|received)|how (is|was) .* (computed|worked out)/i;
const bioHowto = /\bbio\b|description|blurb|keywords?|how (do|can) i|can i/i;
const listingBroken = /unavailable|not available|out of stock/i;

/** Confidence model: a floor for no keyword match, otherwise a base plus a bonus per point of margin. */
const noMatchConfidence = 0.3;
const baseConfidence = 0.4;
const confidencePerMarginPoint = 0.05;
/** Kept well below typical AI confidence so metrics and the UI can tell rule results apart. */
const maxRuleConfidence = 0.7;
const reasoningMaxChars = 300;
const thresholdText = formatINR(payoutThresholdInr);

interface PriorityDecision {
  priority: TicketPriority;
  reason: string;
}

/** Starting priority per category, before facts and urgency adjustments. */
const basePriorityByCategory: Record<TicketCategory, (text: string) => PriorityDecision> = {
  ISBN_METADATA: () => ({ priority: "HIGH", reason: "ISBN/metadata error (policy: high priority)" }),
  PRINTING_QUALITY: () => ({ priority: "HIGH", reason: "print quality defect" }),
  ROYALTY_PAYMENTS: (text) => {
    if (notReceived.test(text) && neverOrLong.test(text)) {
      return { priority: "CRITICAL", reason: "royalty not received for a long period" };
    }
    if (notReceived.test(text)) return { priority: "HIGH", reason: "royalty not received" };
    return {
      priority: "MEDIUM",
      reason: calcQuestion.test(text) ? "royalty calculation question" : "royalty question",
    };
  },
  DISTRIBUTION_AVAILABILITY: () => ({ priority: "MEDIUM", reason: "listing availability issue" }),
  BOOK_STATUS_PRODUCTION: () => ({ priority: "MEDIUM", reason: "production timeline question" }),
  GENERAL_INQUIRY: () => ({ priority: "LOW", reason: "general / how-to question" }),
};

/** One level more urgent (the priorities array is ordered CRITICAL → LOW). */
function raiseOneLevel(priority: TicketPriority): TicketPriority {
  const index = ticketPriorities.indexOf(priority);
  return ticketPriorities[Math.max(0, index - 1)];
}
const moreUrgent = (a: TicketPriority, b: TicketPriority) =>
  ticketPriorities.indexOf(a) <= ticketPriorities.indexOf(b) ? a : b;

/** Categories ranked by weighted keyword score, best first. */
function scoreCategories(text: string) {
  const scores = (Object.entries(categoryPatterns) as [TicketCategory, Pattern[]][]).map(
    ([category, patterns]) => ({
      category,
      score: patterns.reduce((sum, [pattern, weight]) => sum + (pattern.test(text) ? weight : 0), 0),
    }),
  );
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Computed facts beat keywords: genuinely overdue money raises priority, below-threshold doesn't.
 * `settled` means the facts answered the question, so urgency words must not escalate it.
 */
function applyRoyaltyFacts(
  priority: TicketPriority,
  royalty: RoyaltyFacts,
): { priority: TicketPriority; reason: string | null; settled: boolean } {
  if (royalty.longOverdue) {
    return { priority: "CRITICAL", reason: `book data: ${royalty.missedPayoutRuns} payout runs missed`, settled: false };
  }
  if (royalty.status === "OVERDUE") {
    return { priority: moreUrgent(priority, "HIGH"), reason: "book data: payout overdue", settled: false };
  }
  if (royalty.status === "BELOW_THRESHOLD" || royalty.status === "DUE_NEXT_RUN") {
    // The author may feel it is late, but per policy nothing is overdue: a schedule/policy explanation.
    return {
      priority: "MEDIUM",
      settled: true,
      reason:
        royalty.status === "BELOW_THRESHOLD"
          ? `book data: balance below ${thresholdText} threshold (rolls over, not overdue)`
          : "book data: not overdue, due in next payout run",
    };
  }
  return { priority, reason: null, settled: false };
}

function ruleConfidence(bestScore: number, secondScore: number): number {
  const confidence =
    bestScore === 0
      ? noMatchConfidence
      : Math.min(maxRuleConfidence, baseConfidence + confidencePerMarginPoint * (bestScore - secondScore));
  return Math.round(confidence * 100) / 100;
}

export function ruleClassify(
  input: { subject: string; description: string },
  context: { royalty?: RoyaltyFacts | null } = {},
): RuleClassification {
  const text = `${input.subject}\n${input.description}`;

  // 1. Category by weighted keyword score.
  const [best, second] = scoreCategories(text);
  let category: TicketCategory = best.score > 0 ? best.category : "GENERAL_INQUIRY";
  // "Update my description on Amazon" is a how-to, not a broken listing.
  if (category === "DISTRIBUTION_AVAILABILITY" && bioHowto.test(text) && !listingBroken.test(text)) {
    category = "GENERAL_INQUIRY";
  }

  // 2. Base priority per category + specific signals.
  const base = basePriorityByCategory[category](text);
  let priority = base.priority;
  const reasons = [base.reason];

  // 3. Computed facts (royalty tickets only).
  let factsSettled = false;
  if (category === "ROYALTY_PAYMENTS" && context.royalty) {
    const adjusted = applyRoyaltyFacts(priority, context.royalty);
    priority = adjusted.priority;
    factsSettled = adjusted.settled;
    if (adjusted.reason) reasons.push(adjusted.reason);
  }

  // 4. Legal / rights issues are always critical; other urgency words escalate one level
  //    (unless the computed facts already settled the question).
  if (legalOrRights.test(text)) {
    priority = "CRITICAL";
    reasons.push("legal/rights language");
  } else if (urgency.test(text) && priority !== "CRITICAL" && !factsSettled) {
    priority = raiseOneLevel(priority);
    reasons.push("urgency language");
  }

  return {
    category,
    priority,
    confidence: ruleConfidence(best.score, second?.score ?? 0),
    reasoning: `Rule-based: ${reasons.join("; ")}.`.slice(0, reasoningMaxChars),
  };
}
