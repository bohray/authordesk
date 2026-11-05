import type { TicketCategory, TicketPriority } from "@/shared/constants/ticket";
import { ticketPriorities } from "@/shared/constants/ticket";
import type { RoyaltyFacts } from "./context/buildFacts";

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

function bump(p: TicketPriority): TicketPriority {
  const i = ticketPriorities.indexOf(p);
  return ticketPriorities[Math.max(0, i - 1)]; // array is ordered CRITICAL → LOW
}
const max = (a: TicketPriority, b: TicketPriority) =>
  ticketPriorities.indexOf(a) <= ticketPriorities.indexOf(b) ? a : b;

export function ruleClassify(
  input: { subject: string; description: string },
  context: { royalty?: RoyaltyFacts | null } = {},
): RuleClassification {
  const text = `${input.subject}\n${input.description}`;

  // 1. Category by weighted keyword score.
  const scores = (Object.entries(categoryPatterns) as [TicketCategory, Pattern[]][]).map(([cat, pats]) => ({
    cat,
    score: pats.reduce((s, [re, w]) => s + (re.test(text) ? w : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  let category: TicketCategory = best.score > 0 ? best.cat : "GENERAL_INQUIRY";
  // "Update my description on Amazon" is a how-to, not a broken listing.
  if (category === "DISTRIBUTION_AVAILABILITY" && bioHowto.test(text) && !/unavailable|not available|out of stock/i.test(text)) {
    category = "GENERAL_INQUIRY";
  }

  // 2. Base priority per category + specific signals.
  const reasons: string[] = [];
  let priority: TicketPriority;
  switch (category) {
    case "ISBN_METADATA":
      priority = "HIGH";
      reasons.push("ISBN/metadata error (policy: high priority)");
      break;
    case "PRINTING_QUALITY":
      priority = "HIGH";
      reasons.push("print quality defect");
      break;
    case "ROYALTY_PAYMENTS":
      if (notReceived.test(text) && neverOrLong.test(text)) {
        priority = "CRITICAL";
        reasons.push("royalty not received for a long period");
      } else if (notReceived.test(text)) {
        priority = "HIGH";
        reasons.push("royalty not received");
      } else {
        priority = "MEDIUM";
        reasons.push(calcQuestion.test(text) ? "royalty calculation question" : "royalty question");
      }
      break;
    case "DISTRIBUTION_AVAILABILITY":
      priority = "MEDIUM";
      reasons.push("listing availability issue");
      break;
    case "BOOK_STATUS_PRODUCTION":
      priority = "MEDIUM";
      reasons.push("production timeline question");
      break;
    default:
      priority = "LOW";
      reasons.push("general / how-to question");
  }

  // 3. Computed facts beat keywords: genuinely overdue money raises priority, below-threshold doesn't.
  const r = context.royalty;
  let factsSettled = false;
  if (category === "ROYALTY_PAYMENTS" && r) {
    if (r.longOverdue) {
      priority = "CRITICAL";
      reasons.push(`book data: ${r.missedPayoutRuns} payout runs missed`);
    } else if (r.status === "OVERDUE") {
      priority = max(priority, "HIGH");
      reasons.push("book data: payout overdue");
    } else if (r.status === "BELOW_THRESHOLD" || r.status === "DUE_NEXT_RUN") {
      // The author may feel it is late, but per policy nothing is overdue: a schedule/policy explanation.
      priority = "MEDIUM";
      factsSettled = true;
      reasons.push(
        r.status === "BELOW_THRESHOLD"
          ? "book data: balance below ₹1,000 threshold (rolls over, not overdue)"
          : "book data: not overdue, due in next payout run",
      );
    }
  }

  // 4. Legal / rights issues are always critical; other urgency words escalate one level
  //    (unless the computed facts already settled the question).
  if (legalOrRights.test(text)) {
    priority = "CRITICAL";
    reasons.push("legal/rights language");
  } else if (urgency.test(text) && priority !== "CRITICAL" && !factsSettled) {
    priority = bump(priority);
    reasons.push("urgency language");
  }

  const margin = best.score - (second?.score ?? 0);
  const confidence = best.score === 0 ? 0.3 : Math.min(0.7, 0.4 + 0.05 * margin);
  return {
    category,
    priority,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Rule-based: ${reasons.join("; ")}.`.slice(0, 300),
  };
}
