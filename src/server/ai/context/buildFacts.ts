import { msPerDay, msPerHour } from "@/server/lib/time";
import { payoutThresholdInr, allPlatforms, type PublisherNames } from "../knowledge-base/publisher";

/**
 * PURE facts computation. Every number and date the model may quote is computed HERE, in code,
 * so the LLM never does arithmetic or invents dates (the most common hallucination in support
 * replies). The model only has to phrase these facts empathetically.
 */

/** Royalties for a quarter are paid this many days after the quarter ends (KB policy). */
const payoutDelayDays = 45;
/** Missed payout runs from which an overdue royalty counts as "multiple quarters" (CRITICAL). */
const longOverdueMinMissedRuns = 2;

const monthNames = [
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
type ProductionStage = (typeof productionStages)[number];
const publishedStage: ProductionStage = "Published & Live";

const stageDelayNotes: Partial<Record<ProductionStage, string>> = {
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
const startOfDayUTC = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
export const daysBetween = (from: Date, to: Date) =>
  Math.floor((startOfDayUTC(to).getTime() - startOfDayUTC(from).getTime()) / msPerDay);

export function formatDate(date: Date): string {
  return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
const formatMonthYear = (date: Date) => `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export const formatINR = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const shortMonthNames = monthNames.map((month) => month.slice(0, 3));
const monthsPerQuarter = 3;
const quartersPerYear = 4;

/** Quarter end (UTC) for quarter index 0..3 of a year. */
function quarterEnd(year: number, quarter: number): Date {
  // Day 0 of the month after the quarter = last day of the quarter.
  return new Date(Date.UTC(year, (quarter + 1) * monthsPerQuarter, 0));
}

export interface PayoutRun {
  quarterEnd: Date;
  payoutDate: Date;
  /** e.g. "Jul–Sep 2026" */
  quarterLabel: string;
}

function payoutRun(year: number, quarter: number): PayoutRun {
  const end = quarterEnd(year, quarter);
  const firstMonth = quarter * monthsPerQuarter;
  return {
    quarterEnd: end,
    payoutDate: new Date(end.getTime() + payoutDelayDays * msPerDay),
    quarterLabel: `${shortMonthNames[firstMonth]}–${shortMonthNames[firstMonth + monthsPerQuarter - 1]} ${year}`,
  };
}

/** All payout runs whose payout date falls in [from, to] (inclusive, day precision). */
export function payoutRunsBetween(from: Date, to: Date): PayoutRun[] {
  const runs: PayoutRun[] = [];
  const fromDay = startOfDayUTC(from).getTime();
  const toDay = startOfDayUTC(to).getTime();
  // Runs near the year boundary pay out in the following year, so scan one year either side.
  for (let year = from.getUTCFullYear() - 1; year <= to.getUTCFullYear() + 1; year++) {
    for (let quarter = 0; quarter < quartersPerYear; quarter++) {
      const run = payoutRun(year, quarter);
      const payoutDay = run.payoutDate.getTime();
      if (payoutDay >= fromDay && payoutDay <= toDay) runs.push(run);
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
  for (let year = now.getUTCFullYear() - 1; ; year++) {
    for (let quarter = 0; quarter < quartersPerYear; quarter++) {
      const run = payoutRun(year, quarter);
      if (run.payoutDate.getTime() >= today) return run;
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

const notApplicableRoyalty: RoyaltyFacts = {
  status: "NOT_APPLICABLE",
  pending: 0,
  aboveThreshold: false,
  neverPaid: false,
  daysSinceLastPayout: null,
  missedPayoutRuns: 0,
  longOverdue: false,
};

/**
 * Payout runs that should have included this book's earnings but have already passed: after
 * the last payout, or (never paid) from the first quarter that ended after publication.
 */
function countMissedPayoutRuns(publicationDate: Date, lastPayout: Date | null, now: Date): number {
  const yesterday = new Date(startOfDayUTC(now).getTime() - msPerDay);
  const from = lastPayout ? new Date(lastPayout.getTime() + msPerDay) : publicationDate;
  if (from > yesterday) return 0;
  const publishedDay = startOfDayUTC(publicationDate).getTime();
  return payoutRunsBetween(from, yesterday).filter(
    (run) => lastPayout || run.quarterEnd.getTime() >= publishedDay,
  ).length;
}

export function assessRoyalty(book: FactsBook | null, now: Date): RoyaltyFacts {
  if (!book || !book.publicationDate) return { ...notApplicableRoyalty };

  const pending = Math.max(0, book.royalty.pending ?? 0);
  const last = book.royalty.lastPayoutDate;
  const neverPaid = !last;
  const aboveThreshold = pending >= payoutThresholdInr;
  const missed = countMissedPayoutRuns(book.publicationDate, last, now);

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
    longOverdue: status === "OVERDUE" && missed >= longOverdueMinMissedRuns,
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
  const normalised = status.toLowerCase();
  const isPublished = normalised.includes("published") && !normalised.includes("production");
  if (isPublished) {
    return {
      isPublished,
      stage: publishedStage,
      stageIndex: productionStages.length,
      nextStage: null,
      delayNote: stageDelayNotes[publishedStage] ?? null,
    };
  }

  const index = productionStages.findIndex((stage) => normalised.includes(stage.toLowerCase()));
  if (index < 0) return { isPublished, stage: null, stageIndex: null, nextStage: null, delayNote: null };

  const stage = productionStages[index];
  return {
    isPublished,
    stage,
    stageIndex: index + 1,
    nextStage: productionStages[index + 1] ?? null,
    delayNote:
      stageDelayNotes[stage] ??
      `${stage} is not a typical delay point per policy; the actual reason must be checked with the production team.`,
  };
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
  return {
    today: now,
    nextPayout: getNextPayoutRun(now),
    firstName: author?.name.trim().split(/\s+/)[0] ?? null,
    ticketAgeDays: Math.floor(ageMs / msPerDay),
    ticketAgeHours: Math.floor(ageMs / msPerHour),
    book: book ? computeBookFacts(book, input.publisher, now) : null,
  };
}

function computeBookFacts(book: FactsBook, publisher: PublisherNames, now: Date): NonNullable<ComputedFacts["book"]> {
  const listed = book.availableOn ?? [];
  const listedLower = new Set(listed.map((platform) => platform.toLowerCase()));
  const production = assessProduction(book.status);
  return {
    title: book.title,
    daysSincePublication: book.publicationDate ? daysBetween(book.publicationDate, now) : null,
    production,
    royalty: assessRoyalty(production.isPublished ? book : null, now),
    platformsListed: listed,
    platformsMissing: allPlatforms(publisher).filter((platform) => !listedLower.has(platform.toLowerCase())),
  };
}

const threshold = formatINR(payoutThresholdInr);

/** Assessment lines per royalty status. Statuses without an entry add nothing. */
const royaltyAssessmentLines: Partial<Record<RoyaltyStatus, (royalty: RoyaltyFacts, nextPayout: string) => string[]>> = {
  NONE_PENDING: () => [`- Royalty assessment: nothing pending; all earned royalty has been paid.`],
  BELOW_THRESHOLD: (royalty) => [
    `- Threshold check: pending ${formatINR(royalty.pending)} is BELOW the ${threshold} minimum payout threshold.`,
    `- Royalty assessment: NOT OVERDUE. Per policy the balance rolls over to the next quarter and is paid in the first payout run after the accumulated total reaches ${threshold}. Explain this clearly; do not apologise for a delay that is policy.`,
  ],
  DUE_NEXT_RUN: (royalty, nextPayout) => [
    `- Threshold check: pending ${formatINR(royalty.pending)} is ABOVE the ${threshold} minimum.`,
    `- Royalty assessment: ON SCHEDULE. No payout run has been missed yet; it is due in the next payout run on ${nextPayout}.`,
  ],
  OVERDUE: (royalty) => [
    `- Threshold check: pending ${formatINR(royalty.pending)} is ABOVE the ${threshold} minimum, so it should already have been paid.`,
    `- Royalty assessment: OVERDUE. ${royalty.missedPayoutRuns} scheduled payout run(s) have passed without a payment${royalty.longOverdue ? " (multiple quarters)" : ""}. This is our delay: own it without deflection, confirm escalation to the finance team, and commit to an update within 48 hours. (Earnings from the current, still-open quarter are not due yet; they are paid in the run after that quarter ends.)`,
  ],
};

function royaltyLines(royalty: RoyaltyFacts, nextPayout: PayoutRun, lastPayoutDate: Date | null): string[] {
  const nextPayoutText = `${formatDate(nextPayout.payoutDate)} (covers ${nextPayout.quarterLabel})`;
  const lastPayoutLine = lastPayoutDate
    ? `- Last payout: ${formatDate(lastPayoutDate)} (${royalty.daysSinceLastPayout} days ago).`
    : `- Last payout: NEVER. No royalty payout has ever been made for this book.`;
  return [lastPayoutLine, ...(royaltyAssessmentLines[royalty.status]?.(royalty, nextPayoutText) ?? [])];
}

type BookFacts = NonNullable<ComputedFacts["book"]>;

function publishedBookLines(book: FactsBook, bookFacts: BookFacts, nextPayout: PayoutRun): string[] {
  const { royalty } = book;
  const { platformsListed, platformsMissing } = bookFacts;
  const published = book.publicationDate
    ? `, published ${formatDate(book.publicationDate)} (${bookFacts.daysSincePublication} days ago)`
    : "";
  const mrp = book.mrp != null ? formatINR(book.mrp) : "not recorded";
  const royaltyPerCopy = book.royaltyPerCopy != null ? formatINR(book.royaltyPerCopy) : "not recorded";
  const listedOn = platformsListed.length ? platformsListed.join(", ") : "no platforms recorded";
  const missingFrom = platformsMissing.length
    ? ` Not listed on: ${platformsMissing.join(", ")}.`
    : " Listed on every platform we distribute to.";
  return [
    `- Status: Published & Live${published}.`,
    `- MRP: ${mrp}; author royalty per copy: ${royaltyPerCopy}; copies sold: ${book.copiesSold}.`,
    `- Royalty totals: earned ${formatINR(royalty.earned)}, paid ${formatINR(royalty.paid)}, pending ${formatINR(royalty.pending)}.`,
    ...royaltyLines(bookFacts.royalty, nextPayout, royalty.lastPayoutDate),
    `- Bank details: not visible in this system; ask the author to confirm a bank account is linked in the dashboard if payment is in question.`,
    `- Print partner: ${book.printPartner ?? "not recorded"}.`,
    `- Listed on: ${listedOn}.${missingFrom}`,
  ];
}

function inProductionBookLines(book: FactsBook, production: ProductionFacts): string[] {
  const stagePosition = production.stageIndex
    ? ` (stage ${production.stageIndex} of ${productionStages.length})`
    : "";
  const next = production.nextStage ? `; next stage: ${production.nextStage}` : "";
  return [
    `- Status: IN PRODUCTION, current stage ${production.stage ?? book.status}${stagePosition}${next}.`,
    `- Time spent in the current stage: not recorded in this system (do not guess; the team will confirm).`,
    ...(production.delayNote ? [`- ${production.delayNote}`] : []),
    `- Not yet published: no MRP, sales or royalty yet; not listed on any platform. After publication, listings typically go live within 7–10 business days.`,
  ];
}

/** Render the compact FACTS block that goes into the draft prompt. */
export function renderFactsBlock(input: FactsInput, facts: ComputedFacts = computeFacts(input)): string {
  const { ticket, book, author, publisher } = input;
  const ticketAge = facts.ticketAgeDays > 0 ? `${facts.ticketAgeDays} day(s)` : `${facts.ticketAgeHours} hour(s)`;
  const replies = `${ticket.replyCount} support repl${ticket.replyCount === 1 ? "y" : "ies"}`;
  const lines: string[] = [
    `Today: ${formatDate(facts.today)} (${isoDate(facts.today)})`,
    `Ticket: ${ticket.ticketNumber}, status ${ticket.status}, opened ${ticketAge} ago, ${replies} so far.`,
  ];
  if (author) {
    const tenure = author.joinedDate ? `; author with ${publisher.name} since ${formatMonthYear(author.joinedDate)}` : "";
    lines.push(`Author: greet as "${facts.firstName}"${tenure}.`);
  }
  lines.push(
    `Next scheduled royalty payout date (all authors): ${formatDate(facts.nextPayout.payoutDate)}, covering the ${facts.nextPayout.quarterLabel} quarter.`,
  );

  if (!book || !facts.book) {
    lines.push(`Book: none selected (general / account-level query). Do not assume any book details.`);
  } else {
    lines.push(`Book: "${book.title}" (ISBN ${book.isbn}${book.genre ? `, ${book.genre}` : ""})`);
    lines.push(
      ...(facts.book.production.isPublished
        ? publishedBookLines(book, facts.book, facts.nextPayout)
        : inProductionBookLines(book, facts.book.production)),
    );
  }
  lines.push(`Facts not listed here are UNKNOWN: do not invent them.`);
  return lines.join("\n");
}

/** One-line royalty verdict for the classifier context, per status. */
const classifyAssessment: Record<RoyaltyStatus, (royalty: RoyaltyFacts) => string> = {
  OVERDUE: (royalty) => `OVERDUE, ${royalty.missedPayoutRuns} payout run(s) missed`,
  BELOW_THRESHOLD: () => `below ${threshold} threshold (rolls over, not overdue)`,
  DUE_NEXT_RUN: () => "due in next payout run",
  NONE_PENDING: () => "nothing pending",
  NOT_APPLICABLE: () => "nothing pending",
};

/** A 1–3 line context summary for the classifier (cheap, no PII, only priority-relevant signals). */
export function renderClassifyContext(input: FactsInput, facts: ComputedFacts = computeFacts(input)): string {
  if (!input.book || !facts.book) return "Book: none (general / account-level query).";
  const { production, royalty, daysSincePublication } = facts.book;
  if (!production.isPublished) return `Book status: in production (stage: ${production.stage ?? input.book.status}).`;
  const last = royalty.neverPaid ? "never paid" : `last payout ${royalty.daysSinceLastPayout} days ago`;
  return `Book status: Published & Live, ${daysSincePublication ?? "?"} days since publication. Royalty pending ${formatINR(royalty.pending)}; ${last}; ${classifyAssessment[royalty.status](royalty)}.`;
}
