import { describe, expect, it } from "vitest";
import {
  assessProduction,
  assessRoyalty,
  computeFacts,
  getNextPayoutDate,
  isoDate,
  renderClassifyContext,
  renderFactsBlock,
  type FactsBook,
  type FactsInput,
} from "@/server/ai/context/build-facts";
import { publisherNames } from "@/server/ai/knowledge-base/publisher";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const NOW = new Date("2026-11-05T10:00:00Z");
const publisher = publisherNames("Inkwell Publishing");

const book = (over: Partial<FactsBook> = {}): FactsBook => ({
  title: "Between Two Temples",
  isbn: "978-93-5XXXX-05-9",
  genre: "Fiction",
  status: "Published & Live",
  publicationDate: d("2024-07-05"),
  mrp: 425,
  royaltyPerCopy: 38,
  copiesSold: 67,
  royalty: { earned: 2546, paid: 0, pending: 2546, lastPayoutDate: null },
  printPartner: "Epitome Books",
  availableOn: ["Amazon India", "Inkwell Store"],
  ...over,
});

const input = (b: FactsBook | null): FactsInput => ({
  now: NOW,
  publisher,
  ticket: { ticketNumber: "T-1001", status: "OPEN", createdAt: new Date("2026-11-01T08:00:00Z"), replyCount: 0 },
  book: b,
  author: { name: "Ananya Reddy", joinedDate: d("2023-05-01") },
});

describe("payout schedule", () => {
  it.each([
    ["2026-11-05", "2026-11-14"],
    ["2026-11-14", "2026-11-14"],
    ["2026-11-20", "2027-02-14"],
    ["2026-01-01", "2026-02-14"],
    ["2026-02-15", "2026-05-15"],
    ["2026-06-01", "2026-08-14"],
  ])("now=%s → next payout %s", (now, expected) => {
    expect(isoDate(getNextPayoutDate(d(now)))).toBe(expected);
  });
});

describe("royalty assessment", () => {
  it("below ₹1,000 threshold, never paid → rolls over, NOT overdue", () => {
    const r = assessRoyalty(book({ royalty: { earned: 850, paid: 0, pending: 850, lastPayoutDate: null } }), NOW);
    expect(r).toMatchObject({ status: "BELOW_THRESHOLD", neverPaid: true, aboveThreshold: false, longOverdue: false });
  });

  it("above threshold, never paid for over a year → OVERDUE, long overdue", () => {
    const r = assessRoyalty(book(), NOW);
    expect(r.status).toBe("OVERDUE");
    expect(r.neverPaid).toBe(true);
    expect(r.missedPayoutRuns).toBeGreaterThanOrEqual(4);
    expect(r.longOverdue).toBe(true);
  });

  it("does not count the payout run for the quarter BEFORE publication as missed", () => {
    // Published 2026-07-10: first eligible run is 14 Nov 2026 (Jul–Sep), which is still ahead.
    const r = assessRoyalty(book({ publicationDate: d("2026-07-10") }), NOW);
    expect(r.status).toBe("DUE_NEXT_RUN");
  });

  it("recent payout → due next run; nothing pending → NONE_PENDING", () => {
    const recent = assessRoyalty(
      book({ royalty: { earned: 5000, paid: 3000, pending: 2000, lastPayoutDate: d("2026-08-14") } }),
      NOW,
    );
    expect(recent.status).toBe("DUE_NEXT_RUN");
    expect(recent.daysSinceLastPayout).toBe(83);
    const none = assessRoyalty(book({ royalty: { earned: 10, paid: 10, pending: 0, lastPayoutDate: d("2026-08-14") } }), NOW);
    expect(none.status).toBe("NONE_PENDING");
  });

  it("facts block states the distinction explicitly", () => {
    const overdue = renderFactsBlock(input(book()));
    expect(overdue).toContain("Last payout: NEVER");
    expect(overdue).toContain("ABOVE the ₹1,000 minimum");
    expect(overdue).toContain("OVERDUE");
    expect(overdue).toContain("48 hours");
    expect(overdue).toContain("14 November 2026");

    const below = renderFactsBlock(input(book({ royalty: { earned: 850, paid: 0, pending: 850, lastPayoutDate: null } })));
    expect(below).toContain("BELOW the ₹1,000 minimum");
    expect(below).toContain("NOT OVERDUE");
    expect(below).not.toContain("Royalty assessment: OVERDUE");
  });
});

describe("facts block", () => {
  it("handles a null book (general ticket)", () => {
    const text = renderFactsBlock(input(null));
    expect(text).toContain("Book: none selected");
    expect(text).toContain('greet as "Ananya"');
    expect(text).toContain("14 November 2026");
    expect(renderClassifyContext(input(null))).toMatch(/none/);
    expect(computeFacts(input(null)).book).toBeNull();
  });

  it("handles an in-production book with null MRP / publication date", () => {
    const b = book({
      status: "In Production - Cover Design",
      publicationDate: null,
      mrp: null,
      royaltyPerCopy: null,
      copiesSold: 0,
      royalty: { earned: 0, paid: 0, pending: 0, lastPayoutDate: null },
      printPartner: null,
      availableOn: [],
    });
    const text = renderFactsBlock(input(b));
    expect(text).toContain("IN PRODUCTION");
    expect(text).toContain("Cover Design");
    expect(text).toContain("author's approval");
    expect(text).toContain("next stage: Typesetting");
    expect(text).not.toMatch(/NaN|undefined|null/);
    expect(computeFacts(input(b)).book?.royalty.status).toBe("NOT_APPLICABLE");
  });

  it("computes days since publication, ticket age, and missing platforms", () => {
    const f = computeFacts(input(book()));
    expect(f.book?.daysSincePublication).toBe(853);
    expect(f.ticketAgeDays).toBe(4);
    expect(f.book?.platformsMissing).toEqual(["Flipkart", "Amazon US", "Amazon UK"]);
    const text = renderFactsBlock(input(book()));
    expect(text).toContain("Not listed on: Flipkart, Amazon US, Amazon UK");
    expect(text).toContain("Print partner: Epitome Books");
  });

  it("maps production stages and their typical delay points", () => {
    expect(assessProduction("In Production - Proofreading").delayNote).toMatch(/revision rounds/);
    expect(assessProduction("In Production - Typesetting")).toMatchObject({ stage: "Typesetting", stageIndex: 4 });
    expect(assessProduction("Published & Live").isPublished).toBe(true);
  });
});
