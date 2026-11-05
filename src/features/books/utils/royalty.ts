import { formatDate, formatINR } from "@/lib/format";
import { uiMessages } from "@/constants/messages";
import { payoutSummaryText } from "@/constants/books";
import type { BookDTO, MyBooksDTO } from "@/shared/types/dto";

export type NoteTone = "info" | "warn" | "muted";
export interface RoyaltyNote {
  tone: NoteTone;
  text: string;
}

/** Per-book explanatory notes for the edge cases authors ask support about most. */
export function getRoyaltyNotes(book: BookDTO, threshold: number): RoyaltyNote[] {
  if (!book.isPublished) {
    return [{ tone: "info", text: uiMessages.books.inProductionNote }];
  }
  const notes: RoyaltyNote[] = [];
  const { pending, paid, lastPayoutDate } = book.royalty;
  if (pending > 0 && pending < threshold) {
    notes.push({ tone: "warn", text: uiMessages.books.belowThreshold(formatINR(threshold)) });
  }
  if (paid === 0 && !lastPayoutDate) {
    notes.push({ tone: "muted", text: uiMessages.books.neverPaid });
  }
  return notes;
}

/** One-line explanation under the "Next payout" card. */
export function getPayoutSummary(data: MyBooksDTO): { text: string; tone: NoteTone } {
  const { pending } = data.totals;
  const threshold = formatINR(data.payoutThreshold);
  if (pending <= 0) {
    return { tone: "muted", text: payoutSummaryText.nothingPending(threshold) };
  }
  if (pending < data.payoutThreshold) {
    return { tone: "warn", text: payoutSummaryText.belowThreshold(formatINR(pending), threshold) };
  }
  return {
    tone: "info",
    text: payoutSummaryText.scheduled(formatINR(pending), formatDate(data.nextPayoutDate), threshold),
  };
}
