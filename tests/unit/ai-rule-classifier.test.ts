import { describe, expect, it } from "vitest";
import { PRIORITY_RANK } from "@/shared/constants/ticket";
import { ruleClassify } from "@/server/ai/rule-classifier";
import type { RoyaltyFacts } from "@/server/ai/context/build-facts";

const c = (subject: string, description = "") => ruleClassify({ subject, description });

describe("rule classifier: KB sample queries", () => {
  it.each([
    ["No royalty yet", "My book was published 4 months ago and I have no royalty yet.", "ROYALTY_PAYMENTS"],
    ["Royalty too low", "I sold 200 copies but only got ₹3,000.", "ROYALTY_PAYMENTS"],
    ["ISBN mismatch", "Different ISBN on Amazon than on the physical copy.", "ISBN_METADATA"],
    ["Author copies", "Author copies have blurry images, misaligned pages.", "PRINTING_QUALITY"],
    ["Unavailable", "Published but 'Currently Unavailable' on Amazon.", "DISTRIBUTION_AVAILABILITY"],
    ["Still typesetting", "3 weeks and still in typesetting.", "BOOK_STATUS_PRODUCTION"],
    ["Description", "Can I update my Amazon description after it's live?", "GENERAL_INQUIRY"],
    ["Bio", "How do I update my author bio?", "GENERAL_INQUIRY"],
  ])("%s → %s", (subject, description, expected) => {
    expect(c(subject, description).category).toBe(expected);
  });

  it("applies the priority heuristics", () => {
    expect(c("ISBN mismatch", "Different ISBN on Amazon than on the physical copy.").priority).toBe("HIGH");
    expect(c("Damaged copies", "Binding defects and misprints in my copies.").priority).toBe("HIGH");
    expect(c("Unavailable", "Book shows Currently Unavailable on Flipkart.").priority).toBe("MEDIUM");
    expect(c("Production", "Still in cover design, when will it move?").priority).toBe("MEDIUM");
    expect(c("Bio", "How do I update my author bio?").priority).toBe("LOW");
    expect(c("Royalty", "I have never received any royalty payment.").priority).toBe("CRITICAL");
    expect(c("Royalty", "I haven't received my royalty payment.").priority).toBe("HIGH");
    expect(c("Royalty", "How is my royalty calculated?").priority).toBe("MEDIUM");
  });

  it("ranks '6 months no royalty' above 'update my bio'", () => {
    const royalty = c("Royalty", "It has been 6 months and I haven't received any royalty.");
    const bio = c("Bio", "Can I update my bio on the dashboard?");
    expect(royalty.category).toBe("ROYALTY_PAYMENTS");
    expect(PRIORITY_RANK[royalty.priority]).toBeGreaterThan(PRIORITY_RANK[bio.priority]);
    expect(royalty.priority).toBe("CRITICAL");
  });

  it("escalates one level on urgency words and to CRITICAL on legal language", () => {
    expect(c("Bio", "URGENT: how do I update my author bio?").priority).toBe("MEDIUM");
    expect(c("Cover", "My cover was copied, this is a copyright issue and I will contact my lawyer.").priority).toBe(
      "CRITICAL",
    );
  });

  it("uses computed royalty facts: below threshold is not treated as overdue", () => {
    const below: RoyaltyFacts = {
      status: "BELOW_THRESHOLD", pending: 850, aboveThreshold: false, neverPaid: true,
      daysSinceLastPayout: null, missedPayoutRuns: 0, longOverdue: false,
    };
    const overdue: RoyaltyFacts = { ...below, status: "OVERDUE", pending: 2546, aboveThreshold: true, missedPayoutRuns: 8, longOverdue: true };
    const text = { subject: "Royalty", description: "I have never received any royalty." };
    expect(ruleClassify(text, { royalty: below }).priority).toBe("MEDIUM");
    expect(ruleClassify(text, { royalty: overdue }).priority).toBe("CRITICAL");
    expect(ruleClassify({ subject: "Royalty", description: "When is the next payout?" }, { royalty: overdue }).priority).toBe(
      "CRITICAL",
    );
  });

  it("returns bounded, low-ish confidence and a reasoning string", () => {
    const r = c("hello", "random text with no signal");
    expect(r.category).toBe("GENERAL_INQUIRY");
    expect(r.confidence).toBeLessThanOrEqual(0.7);
    expect(r.reasoning.length).toBeLessThanOrEqual(300);
  });
});
