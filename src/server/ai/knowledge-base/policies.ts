import type { PublisherNames } from "./publisher";

/**
 * The publisher's support knowledge base, verbatim policy split into sections. Stored as TS
 * strings (not .md read from disk) so it is bundled with the serverless function and can be
 * templated with the configured publisher name.
 *
 * Sections are small on purpose: the draft prompt includes ONLY the section(s) relevant to a
 * ticket's category, which keeps input tokens low and avoids the model citing unrelated policy.
 */
export type KbSectionKey =
  | "OVERVIEW_BRIEF"
  | "OVERVIEW_FULL"
  | "ROYALTY"
  | "ISBN"
  | "PRINTING"
  | "DISTRIBUTION"
  | "PRODUCTION"
  | "METADATA_UPDATES";

export function kbSections(p: PublisherNames): Record<KbSectionKey, string> {
  const P = p.name;
  return {
    // Always-on, ~40 tokens: enough identity for any reply without paying for the full overview.
    OVERVIEW_BRIEF: `${P} is a self-publishing company operating in India and the US. It handles cover design, typesetting, ISBN assignment, printing, distribution, and royalty management for its authors.`,

    OVERVIEW_FULL: `Company Overview:
- ${P} is a self-publishing company operating in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid package with marketing and distribution add-ons).
- Handles cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
- In-house printing facility and warehouse in Delhi. Print partners include Repro India and Epitome Books.`,

    ROYALTY: `Royalty Policy:
- 80/20 royalty split: 80% of the net profit per book goes to the author, 20% to ${P}.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold: ₹1,000. If accumulated royalties are below this, they roll over to the next quarter.
- Payouts are made via bank transfer to the account linked in the author's dashboard.
- Authors can view a detailed royalty breakdown in their dashboard, showing sales figures per platform.`,

    ISBN: `ISBN Policy:
- Every book receives a unique ISBN assigned by ${P}.
- ISBNs are registered under ${P}'s imprint. If an author wants an ISBN under their own imprint, they need to obtain it independently.
- ISBN errors (duplicate, wrong book linked) are treated as high-priority and escalated to the production team.`,

    PRINTING: `Printing & Quality:
- In-house printing handles most orders. Overflow or specific format requirements go to Repro India or Epitome Books.
- Standard print turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects, color inconsistency): free reprint after verification. The author may need to share photos of the defective copy.`,

    DISTRIBUTION: `Distribution & Availability:
- Listed on Amazon India, Flipkart, Amazon US, Amazon UK, and the ${p.store}.
- New listings typically go live within 7–10 business days after publication is complete.
- "Unavailable" on a platform usually indicates a stock sync issue; the team can trigger a re-sync within 24–48 hours.`,

    PRODUCTION: `Production Stages:
- Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Authors are updated at each stage via email. Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).
- After publication is complete, new listings typically go live within 7–10 business days.`,

    METADATA_UPDATES: `Metadata & Listing Updates:
- Book metadata (description, author bio, keywords) can be updated after the book is live, via the author dashboard or by emailing the support team.
- Changes typically reflect on platforms within 3–5 business days.`,
  };
}

/** Which KB sections each category's draft prompt receives (beyond OVERVIEW_BRIEF). */
export const CATEGORY_KB_SECTIONS = {
  ROYALTY_PAYMENTS: ["ROYALTY"],
  ISBN_METADATA: ["ISBN", "METADATA_UPDATES"],
  PRINTING_QUALITY: ["PRINTING"],
  DISTRIBUTION_AVAILABILITY: ["DISTRIBUTION"],
  BOOK_STATUS_PRODUCTION: ["PRODUCTION"],
  GENERAL_INQUIRY: ["OVERVIEW_FULL", "METADATA_UPDATES"],
} as const satisfies Record<string, readonly KbSectionKey[]>;

/**
 * Category definitions used by the classifier. They mirror the KB scope so classification and
 * drafting agree on what each category covers.
 */
export const CATEGORY_DEFINITIONS: Record<keyof typeof CATEGORY_KB_SECTIONS, string> = {
  ROYALTY_PAYMENTS:
    "Royalty amounts, payouts, missing/late payments, royalty calculation or breakdown, bank transfer issues.",
  ISBN_METADATA:
    "Wrong, duplicate or mismatched ISBN; wrong book/author/title data linked to a listing; imprint questions.",
  PRINTING_QUALITY:
    "Physical copy defects: misprints, blurry images, misaligned pages, binding, colour; print orders and reprints.",
  DISTRIBUTION_AVAILABILITY:
    "Book not found / 'Currently Unavailable' / out of stock on Amazon, Flipkart or the publisher store; new listings; platform coverage.",
  BOOK_STATUS_PRODUCTION:
    "Where a book is in production (editing, cover design, typesetting, proofreading, ISBN assignment, printing), timelines and delays before it is live.",
  GENERAL_INQUIRY:
    "How-to and account questions, packages, updating bio/description/keywords on a live book, anything not covered above.",
};
