import "server-only";
import mongoose from "mongoose";
import { AiUsageLog } from "@/server/db/models";
import { logger } from "@/server/lib/logger";

export type AiOperation = "CLASSIFY" | "DRAFT";

export interface UsageEntry {
  operation: AiOperation;
  provider: string;
  model: string;
  ticketId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode: string | null;
}

type Sink = (entry: UsageEntry) => void;
let testSink: Sink | null = null;
const pending = new Set<Promise<unknown>>();

/** Unit tests capture entries in memory instead of writing to MongoDB. */
export function setUsageSinkForTesting(sink: Sink | null) {
  testSink = sink;
}

/**
 * Record one LLM attempt (success or failure). Fire-and-forget on purpose: cost telemetry
 * must never add latency to, or break, the ticket flow. Failures are only logged.
 */
export function logUsage(entry: UsageEntry): void {
  logger.info("ai.call", { ...entry }); // ids, model and token counts only: never prompt text
  if (testSink) {
    testSink(entry);
    return;
  }
  // Without a live connection (e.g. a unit test), skip rather than let Mongoose buffer.
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return;

  const ticketId =
    entry.ticketId && mongoose.isValidObjectId(entry.ticketId) ? new mongoose.Types.ObjectId(entry.ticketId) : null;
  const write = AiUsageLog.create({ ...entry, ticketId })
    .catch((err: unknown) => logger.warn("ai.usage_log_failed", { error: String(err) }))
    .finally(() => pending.delete(write));
  pending.add(write);
}

/** Await in-flight usage writes (tests; optionally before a serverless function ends). */
export async function flushUsageLogs(): Promise<void> {
  await Promise.all([...pending]);
}
