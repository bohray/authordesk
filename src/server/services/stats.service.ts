import "server-only";
import { ticketPriorities, ticketStatuses } from "@/shared/constants/ticket";
import type { AdminStatsDTO } from "@/shared/types/dto";
import { iso } from "../mappers/common";
import { getAiUsageTotals } from "../repositories/aiUsage.repository";
import { getTicketStats } from "../repositories/ticket.repository";

/** Ratios are rounded to 4 decimal places (0.1234 → 12.34%), enough for a percentage display. */
const ratioScale = 10_000;
const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.round((numerator / denominator) * ratioScale) / ratioScale : 0;

/** Bucket for open tickets the classifier hasn't labelled yet. */
const unclassifiedKey = "UNCLASSIFIED";
const emptyClassificationCounts = { classified: 0, rule: 0, suggested: 0, overridden: 0 };

/** A zero count for every key, so the DTO has every key even when no ticket has that value. */
function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  // Object.fromEntries loses the key type; every key is set above, so the cast is safe.
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

export async function getAdminStats(): Promise<AdminStatsDTO> {
  const [ticketStats, usage] = await Promise.all([getTicketStats(), getAiUsageTotals()]);

  const openByPriority = zeroCounts([...ticketPriorities, unclassifiedKey]);
  for (const row of ticketStats.openByPriority) openByPriority[row._id ?? unclassifiedKey] += row.n;

  const byStatus = zeroCounts(ticketStatuses);
  for (const row of ticketStats.byStatus) if (row._id in byStatus) byStatus[row._id] = row.n;

  const classification = ticketStats.classification[0] ?? emptyClassificationCounts;

  return {
    openByPriority,
    byStatus,
    unassigned: ticketStats.unassigned[0]?.n ?? 0,
    oldestOpenAt: iso(ticketStats.oldestOpen[0]?.at ?? null),
    ai: {
      calls: usage.calls,
      failures: usage.failures,
      // Share of processed tickets that fell back to the rule-based classifier.
      fallbackRate: ratio(classification.rule, classification.classified),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      // Share of AI suggestions an admin later changed: a rough accuracy signal.
      overrideRate: ratio(classification.overridden, classification.suggested),
    },
  };
}
