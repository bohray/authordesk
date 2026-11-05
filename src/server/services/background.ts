import "server-only";
import { after } from "next/server";
import { logger } from "../lib/logger";

/**
 * Run work after the response has been sent (Next `after`, backed by waitUntil on
 * serverless), so slow side effects such as AI classification never delay the user.
 * Errors are logged rather than thrown: nobody is left to receive them.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task();
    } catch (err) {
      logger.error("Background task failed", {
        task: label,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
