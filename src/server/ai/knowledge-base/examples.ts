import type { TicketCategory } from "@/shared/constants/ticket";

/**
 * KB "Sample Query → Expected Response" guidance, keyed by category. These are response
 * STRATEGIES (not canned text) so the model adapts them to the computed facts instead of
 * copying a template.
 */
export interface ResponseGuidance {
  query: string;
  guidance: string;
}

export const responseGuidance: Record<TicketCategory, ResponseGuidance[]> = {
  ROYALTY_PAYMENTS: [
    {
      query: "Published 4 months ago, no royalty yet.",
      guidance:
        "Acknowledge the frustration. Explain the quarterly cycle and 45-day payout window. Check whether bank details are linked. Give the specific next payout date. If genuinely overdue, escalate with a 48-hour resolution timeline.",
    },
    {
      query: "Sold 200 copies but only got ₹3,000.",
      guidance:
        "Explain net profit: MRP minus printing, platform commission, shipping. Offer a detailed line-by-line royalty breakdown. Don't be defensive; offer transparency.",
    },
  ],
  ISBN_METADATA: [
    {
      query: "Different ISBN on Amazon than on the physical copy.",
      guidance:
        "High priority. Acknowledge it's a serious data issue. Confirm immediate escalation to production. 48-hour resolution timeline.",
    },
  ],
  PRINTING_QUALITY: [
    {
      query: "Author copies have blurry images, misaligned pages.",
      guidance:
        "Apologise sincerely. Ask for photos. Confirm a free reprint once verified. 5–7 business days for the reprint.",
    },
  ],
  DISTRIBUTION_AVAILABILITY: [
    {
      query: "Published but 'Currently Unavailable' on Amazon.",
      guidance: "Typically a stock sync issue. Confirm you're triggering a re-sync. 24–48 hours to go live again.",
    },
  ],
  BOOK_STATUS_PRODUCTION: [
    {
      query: "3 weeks and still in typesetting.",
      guidance:
        "Check the actual status. If delayed, be honest about why (e.g., waiting on proof approval). Give a specific updated timeline. Don't blame the author even if the delay is on their side; frame it collaboratively.",
    },
  ],
  GENERAL_INQUIRY: [
    {
      query: "Can I update my Amazon description after it's live?",
      guidance: "Yes, metadata updates via the dashboard or by emailing the team; changes reflect within 3–5 business days.",
    },
  ],
};
