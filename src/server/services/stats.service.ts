import "server-only";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/shared/constants/ticket";
import type { AdminStatsDTO } from "@/shared/types/dto";
import { iso } from "../mappers/common";
import { getAiUsageTotals } from "../repositories/ai-usage.repository";
import { getTicketStats } from "../repositories/ticket.repository";

/** Ratios are rounded to 4 decimal places (0.1234 → 12.34%), enough for a percentage display. */
const RATIO_SCALE = 10_000;
const ratio = (num: number, den: number) => (den > 0 ? Math.round((num / den) * RATIO_SCALE) / RATIO_SCALE : 0);

export async function getAdminStats(): Promise<AdminStatsDTO> {
  const [t, usage] = await Promise.all([getTicketStats(), getAiUsageTotals()]);

  // Start from zeroes so every key is present even when no ticket has that value.
  const openByPriority = Object.fromEntries(
    [...TICKET_PRIORITIES, "UNCLASSIFIED"].map((k) => [k, 0]),
  ) as AdminStatsDTO["openByPriority"];
  for (const row of t.openByPriority) openByPriority[row._id ?? "UNCLASSIFIED"] += row.n;

  const byStatus = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0])) as AdminStatsDTO["byStatus"];
  for (const row of t.byStatus) if (row._id in byStatus) byStatus[row._id] = row.n;

  const c = t.classification[0] ?? { classified: 0, rule: 0, suggested: 0, overridden: 0 };

  return {
    openByPriority,
    byStatus,
    unassigned: t.unassigned[0]?.n ?? 0,
    oldestOpenAt: iso(t.oldestOpen[0]?.at ?? null),
    ai: {
      calls: usage.calls,
      failures: usage.failures,
      // Share of processed tickets that fell back to the rule-based classifier.
      fallbackRate: ratio(c.rule, c.classified),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      // Share of AI suggestions an admin later changed: a rough accuracy signal.
      overrideRate: ratio(c.overridden, c.suggested),
    },
  };
}
