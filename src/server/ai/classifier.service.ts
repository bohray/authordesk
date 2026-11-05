import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Ticket, TicketEvent } from "@/server/db/models";
import { logger } from "@/server/lib/logger";
import {
  priorityRankByLevel,
  type AiStatus,
  type TicketCategory,
  type TicketPriority,
} from "@/shared/constants/ticket";
import { computeFacts, renderClassifyContext, type RoyaltyFacts } from "./context/buildFacts";
import { loadTicketContext } from "./context/loadContext";
import { publisherNames } from "./knowledge-base/publisher";
import { callLLM } from "./llmClient";
import {
  classifyJsonSchema,
  classifyMaxOutputTokens,
  classifyPromptVersion,
  classifyRetrySuffix,
  buildClassifySystemPrompt,
  buildClassifyUserPrompt,
  parseClassification,
} from "./prompts/classify.prompt";
import { isLLMError, type LLMErrorKind } from "./providers/llmProvider";
import { ruleEngineModel, ruleClassify } from "./ruleClassifier";

/** A second classify call for the same ticket within this window is a duplicate and is dropped. */
const claimWindowMs = 30_000;
/** Logical AI attempts per ticket; the second runs only after malformed output. */
const maxClassifyAttempts = 2;
/** Unexpected-error detail kept in ai.error. */
const errorDetailMaxChars = 120;
/** Shown in the "from" side of the timeline event when a value was never set. */
const missingValuePlaceholder = "—";

type OutcomeSource = "AI" | "RULE";

/** Human-readable reason recorded on the ticket when the rule engine had to step in. */
const fallbackReasonByKind = {
  NOT_CONFIGURED: "No AI provider configured",
  RATE_LIMIT: "AI providers rate-limited",
  TIMEOUT: "AI request timed out",
  UNAVAILABLE: "AI providers unavailable",
  BAD_RESPONSE: "AI returned invalid output twice",
  INTERNAL: "Unexpected error during AI classification",
} satisfies Record<LLMErrorKind | "INTERNAL", string>;

const aiStatusBySource = { AI: "DONE", RULE: "FAILED" } satisfies Record<OutcomeSource, AiStatus>;
const actorNameBySource = { AI: "AI", RULE: "Rule engine" } satisfies Record<OutcomeSource, string>;

interface Outcome {
  source: OutcomeSource;
  category: TicketCategory;
  priority: TicketPriority;
  confidence: number;
  reasoning: string;
  model: string;
  error: string | null;
}

function errorMessage(kind: keyof typeof fallbackReasonByKind, detail: string): string {
  const suffix = detail ? ` (${detail.slice(0, errorDetailMaxChars)})` : "";
  return `${kind}: ${fallbackReasonByKind[kind]}; rule-based classification applied.${suffix}`;
}

/**
 * Atomic claim: protects against double-runs (after() retries, double submits, two instances)
 * and doubles as the attempts counter. Tickets fully overridden by an admin are skipped:
 * spending tokens on a classification nobody will use is pure waste.
 * Returns false when the ticket is missing, admin-classified or already being classified.
 */
async function claimForClassification(ticketId: string, now: Date): Promise<boolean> {
  const claimExpiredBefore = new Date(now.getTime() - claimWindowMs);
  const claimed = await Ticket.findOneAndUpdate(
    {
      _id: ticketId,
      $nor: [{ categorySource: "ADMIN", prioritySource: "ADMIN" }],
      $or: [{ "ai.lastAttemptAt": null }, { "ai.lastAttemptAt": { $lt: claimExpiredBefore } }],
    },
    { $set: { "ai.lastAttemptAt": now }, $inc: { "ai.attempts": 1 } },
    { returnDocument: "after", projection: { _id: 1 } },
  ).lean();
  return claimed !== null;
}

/**
 * Classify a ticket and persist the result. Never throws.
 * AI first; on any failure the deterministic rule engine supplies values so the queue is
 * always sorted, and ai.status=FAILED records that a human should double-check.
 */
export async function classifyTicketImpl(ticketId: string): Promise<void> {
  const startedAt = Date.now();
  try {
    await connectDB();
    if (!mongoose.isValidObjectId(ticketId)) return;

    const now = new Date();
    if (!(await claimForClassification(ticketId, now))) {
      logger.info("ai.classify_skipped", { ticketId, reason: "missing, admin-classified or already in progress" });
      return;
    }

    const context = await loadTicketContext(ticketId, now);
    if (!context) return;
    const { ticket, facts: factsInput } = context;
    const facts = computeFacts(factsInput);

    const outcome = await classifyWithFallback(ticketId, {
      subject: ticket.subject,
      description: ticket.description,
      context: renderClassifyContext(factsInput, facts),
      royalty: facts.book?.royalty ?? null,
    });

    await persist(ticketId, outcome, ticket.category ?? null, ticket.priority ?? null);
    logger.info("ai.classified", {
      ticketId,
      source: outcome.source,
      model: outcome.model,
      category: outcome.category,
      priority: outcome.priority,
      ms: Date.now() - startedAt,
      promptVersion: classifyPromptVersion,
    });
  } catch (err) {
    // Last-resort guard (e.g. DB hiccup mid-flight). Never propagate to the request.
    logger.error("ai.classify_crashed", { ticketId, error: String(err) });
    try {
      await Ticket.updateOne(
        { _id: ticketId },
        { $set: { "ai.status": "FAILED", "ai.error": errorMessage("INTERNAL", "") } },
      );
    } catch {
      /* nothing else we can do; the ticket remains PENDING and can be re-classified */
    }
  }
}

async function classifyWithFallback(
  ticketId: string,
  ticket: { subject: string; description: string; context: string; royalty: RoyaltyFacts | null },
): Promise<Outcome> {
  const system = buildClassifySystemPrompt(publisherNames());
  const user = buildClassifyUserPrompt(ticket);
  let lastKind: LLMErrorKind = "UNAVAILABLE";
  let lastDetail = "";

  // The retry runs only for malformed output (the provider was up, so another try is cheap).
  for (let attempt = 0; attempt < maxClassifyAttempts; attempt++) {
    try {
      const result = await callLLM({
        operation: "CLASSIFY",
        ticketId,
        tier: "small",
        system,
        user: attempt === 0 ? user : user + classifyRetrySuffix,
        responseFormat: "json",
        jsonSchema: classifyJsonSchema,
        maxOutputTokens: classifyMaxOutputTokens,
        temperature: 0, // deterministic triage: same ticket → same label
        parse: parseClassification,
      });
      return { source: "AI", ...result.value, model: result.model, error: null };
    } catch (e) {
      lastKind = isLLMError(e) ? e.kind : "UNAVAILABLE";
      lastDetail = isLLMError(e) ? "" : String(e);
      if (lastKind !== "BAD_RESPONSE") break;
    }
  }

  const rule = ruleClassify(ticket, { royalty: ticket.royalty });
  return { source: "RULE", ...rule, model: ruleEngineModel, error: errorMessage(lastKind, lastDetail) };
}

async function persist(
  ticketId: string,
  outcome: Outcome,
  prevCategory: string | null,
  prevPriority: string | null,
): Promise<void> {
  const { source, category, priority } = outcome;
  const _id = new mongoose.Types.ObjectId(ticketId);
  // Three guarded updates in one round trip. The ADMIN guards live in the FILTER, so an admin
  // override that lands while the LLM call was in flight is still never overwritten.
  await Ticket.bulkWrite(
    [
      {
        updateOne: {
          filter: { _id, categorySource: { $ne: "ADMIN" } },
          update: { $set: { category, categorySource: source } },
        },
      },
      {
        updateOne: {
          filter: { _id, prioritySource: { $ne: "ADMIN" } },
          update: { $set: { priority, prioritySource: source, priorityRank: priorityRankByLevel[priority] } },
        },
      },
      {
        updateOne: {
          filter: { _id },
          update: {
            $set: {
              "ai.status": aiStatusBySource[source],
              "ai.confidence": outcome.confidence,
              "ai.reasoning": outcome.reasoning,
              "ai.model": outcome.model,
              "ai.error": outcome.error,
              // Kept even when an admin value wins: suggested vs final = override-rate metric.
              "ai.suggestedCategory": category,
              "ai.suggestedPriority": priority,
            },
          },
        },
      },
    ],
    { ordered: false },
  );

  await TicketEvent.create({
    ticketId: _id,
    type: "AI_CLASSIFIED",
    actorName: actorNameBySource[source],
    from:
      prevCategory || prevPriority
        ? `${prevCategory ?? missingValuePlaceholder} / ${prevPriority ?? missingValuePlaceholder}`
        : null,
    to: `${category} / ${priority}`,
  });
}
