import { formatDate, formatINR } from "@/lib/format";
import { MESSAGES } from "@/constants/messages";
import type { BookDTO, MyBooksDTO } from "@/shared/types/dto";

export type NoteTone = "info" | "warn" | "muted";
export interface RoyaltyNote {
  tone: NoteTone;
  text: string;
}

/** Per-book explanatory notes for the edge cases authors ask support about most. */
export function getRoyaltyNotes(book: BookDTO, threshold: number): RoyaltyNote[] {
  if (!book.isPublished) {
    return [{ tone: "info", text: MESSAGES.books.inProductionNote }];
  }
  const notes: RoyaltyNote[] = [];
  const { pending, paid, lastPayoutDate } = book.royalty;
  if (pending > 0 && pending < threshold) {
    notes.push({ tone: "warn", text: MESSAGES.books.belowThreshold(formatINR(threshold)) });
  }
  if (paid === 0 && !lastPayoutDate) {
    notes.push({ tone: "muted", text: MESSAGES.books.neverPaid });
  }
  return notes;
}

/** One-line explanation under the "Next payout" card. */
export function getPayoutSummary(data: MyBooksDTO): { text: string; tone: NoteTone } {
  const { pending } = data.totals;
  const threshold = formatINR(data.payoutThreshold);
  const date = formatDate(data.nextPayoutDate);
  if (pending <= 0) {
    return { tone: "muted", text: `Nothing pending right now. Payouts are made when pending royalty reaches ${threshold}.` };
  }
  if (pending < data.payoutThreshold) {
    return {
      tone: "warn",
      text: `Your pending ${formatINR(pending)} is below the ${threshold} threshold and rolls over to the next quarter.`,
    };
  }
  return { tone: "info", text: `${formatINR(pending)} is scheduled for ${date}. Minimum payout is ${threshold}.` };
}
