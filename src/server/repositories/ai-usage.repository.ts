import "server-only";
import { AiUsageLog } from "../db/models";

export interface AiUsageTotals {
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
}

/** Sums the whole log in one round trip (the collection is TTL-bounded to 90 days). */
export async function getAiUsageTotals(): Promise<AiUsageTotals> {
  const [row] = await AiUsageLog.aggregate<AiUsageTotals>([
    {
      $group: {
        _id: null,
        calls: { $sum: 1 },
        failures: { $sum: { $cond: ["$success", 0, 1] } },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
      },
    },
    { $project: { _id: 0 } },
  ]);
  return row ?? { calls: 0, failures: 0, inputTokens: 0, outputTokens: 0 };
}
