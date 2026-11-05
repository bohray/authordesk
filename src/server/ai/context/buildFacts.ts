import { payoutThresholdInr, allPlatforms, type PublisherNames } from "../knowledge-base/publisher";

/**
 * PURE facts computation. Every number and date the model may quote is computed HERE, in code,
 * so the LLM never does arithmetic or invents dates (the most common hallucination in support
 * replies). The model only has to phrase these facts empathetically.
 */

const dayMs = 24 * 60 * 60 * 1000;
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const productionStages = [
  "Manuscript Received",
  "Editing",
  "Cover Design",
  "Typesetting",
  "Proofreading",
  "ISBN Assignment",
  "Printing",
  "Distribution Setup",
  "Published & Live",
] as const;

const stageDelayNotes: Partial<Record<(typeof productionStages)[number], string>> = {
  "Cover Design": "Cover Design is a common delay point: it usually waits on the author's approval of the cover.",
  Proofreading: "Proofreading is a common delay point: it involves revision rounds between author and editor.",
};

/* ------------------------------------------------------------------ */
/* Inputs                                                             */
/* ------------------------------------------------------------------ */
export interface FactsBook {
  title: string;
  isbn: string;
  genre?: string | null;
  status: string;
  publicationDate: Date | null;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royalty: { earned: number; paid: number; pending: number; lastPayoutDate: Date | null };
  printPartner: string | null;
  availableOn: string[];
}

export interface FactsInput {
  now: Date;
  publisher: PublisherNames;
  ticket: { ticketNumber: string; status: string; createdAt: Date; replyCount: number };
  book: FactsBook | null;
  author: { name: string; joinedDate?: Date | null } | null;
}

/* ------------------------------------------------------------------ */
/* Date helpers (UTC, day precision)                                  */
/* ------------------------------------------------------------------ */
const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
export const daysBetween = (from: Date, to: Date) =>
  Math.floor((startOfDayUTC(to).getTime() - startOfDayUTC(from).getTime()) / dayMs);

export function formatDate(d: Date): string {
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Quarter end (UTC) for quarter index q (0..3) of year y. */
function quarterEnd(y: number, q: number): Date {
  return new Date(Date.UTC(y, q * 3 + 3, 0)); // day 0 of next month = last day of quarter
}

export interface PayoutRun {
  quarterEnd: Date;
  payoutDate: Date;
  /** e.g. "Jul–Sep 2026" */
  quarterLabel: string;
}

function payoutRun(y: number, q: number): PayoutRun {
  const qe = quarterEnd(y, q);
  const short = months.map((m) => m.slice(0, 3));
  return {
    quarterEnd: qe,
    payoutDate: new Date(qe.getTime() + 45 * dayMs),
    quarterLabel: `${short[q * 3]}–${short[q * 3 + 2]} ${y}`,
  };
}

/** All payout runs whose payout date falls in [from, to] (inclusive, day precision). */
export function payoutRunsBetween(from: Date, to: Date): PayoutRun[] {
  const runs: PayoutRun[] = [];
  const f = startOfDayUTC(from).getTime();
  const t = startOfDayUTC(to).getTime();
  for (let y = from.getUTCFullYear() - 1; y <= to.getUTCFullYear() + 1; y++) {
    for (let q = 0; q < 4; q++) {
      const r = payoutRun(y, q);
      const p = r.payoutDate.getTime();
      if (p >= f && p <= t) runs.push(r);
    }
  }
  return runs;
}

/**
 * Next scheduled payout: the first "quarter end + 45 days" on or after today.
 * (Quarters end Mar 31 / Jun 30 / Sep 30 / Dec 31 → payouts May 15 / Aug 14 / Nov 14 / Feb 14.)
 */
export function getNextPayoutRun(now: Date): PayoutRun {
  const today = startOfDayUTC(now).getTime();
  for (let y = now.getUTCFullYear() - 1; ; y++) {
    for (let q = 0; q < 4; q++) {
      const r = payoutRun(y, q);
      if (r.payoutDate.getTime() >= today) return r;
    }
  }
}
export const getNextPayoutDate = (now: Date) => getNextPayoutRun(now).payoutDate;

/* ------------------------------------------------------------------ */
/* Royalty assessment                                                 */
/* ------------------------------------------------------------------ */
export type RoyaltyStatus =
  | "NOT_APPLICABLE" // no book or not yet published
  | "NONE_PENDING"
  | "BELOW_THRESHOLD" // rolls over: NOT overdue
  | "DUE_NEXT_RUN" // above threshold, no payout run missed yet
  | "OVERDUE"; // above threshold and at least one payout run has passed without payment

export interface RoyaltyFacts {
  status: RoyaltyStatus;
  pending: number;
  aboveThreshold: boolean;
  neverPaid: boolean;
  daysSinceLastPayout: number | null;
  /** Payout runs that have passed since the last payout (or since first eligible quarter). */
  missedPayoutRuns: number;
  /** Multiple quarters overdue → classification should treat as CRITICAL. */
  longOverdue: boolean;
}

export function assessRoyalty(book: FactsBook | null, now: Date): RoyaltyFacts {
  const base: RoyaltyFacts = {
    status: "NOT_APPLICABLE",
    pending: 0,
    aboveThreshold: false,
    neverPaid: false,
    daysSinceLastPayout: null,
    missedPayoutRuns: 0,
    longOverdue: false,
  };
  if (!book || !book.publicationDate) return base;

  const pending = Math.max(0, book.royalty.pending ?? 0);
  const last = book.royalty.lastPayoutDate;
  const neverPaid = !last;
  const aboveThreshold = pending >= payoutThresholdInr;
  const yesterday = new Date(startOfDayUTC(now).getTime() - dayMs);

  // Runs that should have included this book's earnings: after the last payout, or (never paid)
  // from the first quarter that ended after publication.
  const pub = book.publicationDate;
  const from = last ? new Date(last.getTime() + dayMs) : pub;
  const missed =
    from <= yesterday
      ? payoutRunsBetween(from, yesterday).filter((r) => last || r.quarterEnd.getTime() >= startOfDayUTC(pub).getTime())
          .length
      : 0;

  let status: RoyaltyStatus;
  if (pending <= 0) status = "NONE_PENDING";
  else if (!aboveThreshold) status = "BELOW_THRESHOLD";
  else status = missed > 0 ? "OVERDUE" : "DUE_NEXT_RUN";

  return {
    status,
    pending,
    aboveThreshold,
    neverPaid,
    daysSinceLastPayout: last ? daysBetween(last, now) : null,
    missedPayoutRuns: status === "OVERDUE" ? missed : 0,
    longOverdue: status === "OVERDUE" && missed >= 2,
  };
}

/* ------------------------------------------------------------------ */
/* Production stage                                                   */
/* ------------------------------------------------------------------ */
export interface ProductionFacts {
  isPublished: boolean;
  stage: string | null;
  stageIndex: number | null; // 1-based of productionStages
  nextStage: string | null;
  delayNote: string | null;
}

export function assessProduction(status: string): ProductionFacts {
  const s = status.toLowerCase();
  const isPublished = s.includes("published") && !s.includes("production");
  const idx = productionStages.findIndex((st) => s.includes(st.toLowerCase()));
  const stage = isPublished ? "Published & Live" : idx >= 0 ? productionStages[idx] : null;
  const stageIndex = isPublished ? productionStages.length : idx >= 0 ? idx + 1 : null;
  const nextStage = !isPublished && idx >= 0 && idx < productionStages.length - 1 ? productionStages[idx + 1] : null;
  const delayNote = stage
    ? stageDelayNotes[stage as keyof typeof stageDelayNotes] ??
      (isPublished ? null : `${stage} is not a typical delay point per policy; the actual reason must be checked with the production team.`)
    : null;
  return { isPublished, stage, stageIndex, nextStage, delayNote };
}

/* ------------------------------------------------------------------ */
/* Facts                                                              */
/* ------------------------------------------------------------------ */
export interface ComputedFacts {
  today: Date;
  nextPayout: PayoutRun;
  firstName: string | null;
  ticketAgeDays: number;
  ticketAgeHours: number;
  book: null | {
    title: string;
    daysSincePublication: number | null;
    production: ProductionFacts;
    royalty: RoyaltyFacts;
    platformsListed: string[];
    platformsMissing: string[];
  };
}

export function computeFacts(input: FactsInput): ComputedFacts {
  const { now, book, author, ticket } = input;
  const ageMs = Math.max(0, now.getTime() - ticket.createdAt.getTime());
  let bookFacts: ComputedFacts["book"] = null;
  if (book) {
    const listed = book.availableOn ?? [];
    const lower = new Set(listed.map((x) => x.toLowerCase()));
    const production = assessProduction(book.status);
    bookFacts = {
      title: book.title,
      daysSincePublication: book.publicationDate ? daysBetween(book.publicationDate, now) : null,
      production,
      royalty: assessRoyalty(production.isPublished ? book : null, now),
      platformsListed: listed,
      platformsMissing: allPlatforms(input.publisher).filter((pl) => !lower.has(pl.toLowerCase())),
    };
  }
  return {
    today: now,
    nextPayout: getNextPayoutRun(now),
    firstName: author?.name.trim().split(/\s+/)[0] ?? null,
    ticketAgeDays: Math.floor(ageMs / dayMs),
    ticketAgeHours: Math.floor(ageMs / (60 * 60 * 1000)),
    book: bookFacts,
  };
}

function royaltyLines(r: RoyaltyFacts, nextPayout: PayoutRun, lastPayoutDate: Date | null): string[] {
  const next = `${formatDate(nextPayout.payoutDate)} (covers ${nextPayout.quarterLabel})`;
  const lines: string[] = [];
  lines.push(
    lastPayoutDate
      ? `- Last payout: ${formatDate(lastPayoutDate)} (${r.daysSinceLastPayout} days ago).`
      : `- Last payout: NEVER. No royalty payout has ever been made for this book.`,
  );
  switch (r.status) {
    case "NONE_PENDING":
      lines.push(`- Royalty assessment: nothing pending; all earned royalty has been paid.`);
      break;
    case "BELOW_THRESHOLD":
      lines.push(
        `- Threshold check: pending ${formatINR(r.pending)} is BELOW the ${formatINR(payoutThresholdInr)} minimum payout threshold.`,
        `- Royalty assessment: NOT OVERDUE. Per policy the balance rolls over to the next quarter and is paid in the first payout run after the accumulated total reaches ${formatINR(payoutThresholdInr)}. Explain this clearly; do not apologise for a delay that is policy.`,
      );
      break;
    case "DUE_NEXT_RUN":
      lines.push(
        `- Threshold check: pending ${formatINR(r.pending)} is ABOVE the ${formatINR(payoutThresholdInr)} minimum.`,
        `- Royalty assessment: ON SCHEDULE. No payout run has been missed yet; it is due in the next payout run on ${next}.`,
      );
      break;
    case "OVERDUE":
      lines.push(
        `- Threshold check: pending ${formatINR(r.pending)} is ABOVE the ${formatINR(payoutThresholdInr)} minimum, so it should already have been paid.`,
        `- Royalty assessment: OVERDUE. ${r.missedPayoutRuns} scheduled payout run(s) have passed without a payment${r.longOverdue ? " (multiple quarters)" : ""}. This is our delay: own it without deflection, confirm escalation to the finance team, and commit to an update within 48 hours. (Earnings from the current, still-open quarter are not due yet; they are paid in the run after that quarter ends.)`,
      );
      break;
    default:
      break;
  }
  return lines;
}

/** Render the compact FACTS block that goes into the draft prompt. */
export function renderFactsBlock(input: FactsInput, facts: ComputedFacts = computeFacts(input)): string {
  const { ticket, book, author, publisher } = input;
  const L: string[] = [];
  L.push(`Today: ${formatDate(facts.today)} (${isoDate(facts.today)})`);
  L.push(
    `Ticket: ${ticket.ticketNumber}, status ${ticket.status}, opened ${facts.ticketAgeDays > 0 ? `${facts.ticketAgeDays} day(s)` : `${facts.ticketAgeHours} hour(s)`} ago, ${ticket.replyCount} support repl${ticket.replyCount === 1 ? "y" : "ies"} so far.`,
  );
  if (author) {
    L.push(
      `Author: greet as "${facts.firstName}"${author.joinedDate ? `; author with ${publisher.name} since ${months[author.joinedDate.getUTCMonth()]} ${author.joinedDate.getUTCFullYear()}` : ""}.`,
    );
  }
  L.push(
    `Next scheduled royalty payout date (all authors): ${formatDate(facts.nextPayout.payoutDate)}, covering the ${facts.nextPayout.quarterLabel} quarter.`,
  );

  if (!book || !facts.book) {
    L.push(`Book: none selected (general / account-level query). Do not assume any book details.`);
  } else {
    const b = facts.book;
    L.push(`Book: "${book.title}" (ISBN ${book.isbn}${book.genre ? `, ${book.genre}` : ""})`);
    if (b.production.isPublished) {
      L.push(
        `- Status: Published & Live${book.publicationDate ? `, published ${formatDate(book.publicationDate)} (${b.daysSincePublication} days ago)` : ""}.`,
      );
      L.push(
        `- MRP: ${book.mrp != null ? formatINR(book.mrp) : "not recorded"}; author royalty per copy: ${book.royaltyPerCopy != null ? formatINR(book.royaltyPerCopy) : "not recorded"}; copies sold: ${book.copiesSold}.`,
      );
      const r = book.royalty;
      L.push(`- Royalty totals: earned ${formatINR(r.earned)}, paid ${formatINR(r.paid)}, pending ${formatINR(r.pending)}.`);
      L.push(...royaltyLines(b.royalty, facts.nextPayout, r.lastPayoutDate));
      L.push(`- Bank details: not visible in this system; ask the author to confirm a bank account is linked in the dashboard if payment is in question.`);
      L.push(`- Print partner: ${book.printPartner ?? "not recorded"}.`);
      L.push(
        `- Listed on: ${b.platformsListed.length ? b.platformsListed.join(", ") : "no platforms recorded"}.${b.platformsMissing.length ? ` Not listed on: ${b.platformsMissing.join(", ")}.` : " Listed on every platform we distribute to."}`,
      );
    } else {
      const p = b.production;
      L.push(
        `- Status: IN PRODUCTION, current stage ${p.stage ?? book.status}${p.stageIndex ? ` (stage ${p.stageIndex} of ${productionStages.length})` : ""}${p.nextStage ? `; next stage: ${p.nextStage}` : ""}.`,
      );
      L.push(`- Time spent in the current stage: not recorded in this system (do not guess; the team will confirm).`);
      if (p.delayNote) L.push(`- ${p.delayNote}`);
      L.push(`- Not yet published: no MRP, sales or royalty yet; not listed on any platform. After publication, listings typically go live within 7–10 business days.`);
    }
  }
  L.push(`Facts not listed here are UNKNOWN: do not invent them.`);
  return L.join("\n");
}

/** A 1–3 line context summary for the classifier (cheap, no PII, only priority-relevant signals). */
export function renderClassifyContext(input: FactsInput, facts: ComputedFacts = computeFacts(input)): string {
  if (!input.book || !facts.book) return "Book: none (general / account-level query).";
  const b = facts.book;
  if (!b.production.isPublished) return `Book status: in production (stage: ${b.production.stage ?? input.book.status}).`;
  const r = b.royalty;
  const last = r.neverPaid ? "never paid" : `last payout ${r.daysSinceLastPayout} days ago`;
  const assessment =
    r.status === "OVERDUE"
      ? `OVERDUE, ${r.missedPayoutRuns} payout run(s) missed`
      : r.status === "BELOW_THRESHOLD"
        ? "below ₹1,000 threshold (rolls over, not overdue)"
        : r.status === "DUE_NEXT_RUN"
          ? "due in next payout run"
          : "nothing pending";
  return `Book status: Published & Live, ${b.daysSincePublication ?? "?"} days since publication. Royalty pending ${formatINR(r.pending)}; ${last}; ${assessment}.`;
}
