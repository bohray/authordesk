import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Ticket, TicketEvent } from "@/server/db/models";
import { logger } from "@/server/lib/logger";
import { priorityRankByLevel, type TicketCategory, type TicketPriority } from "@/shared/constants/ticket";
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

interface Outcome {
  source: "AI" | "RULE";
  category: TicketCategory;
  priority: TicketPriority;
  confidence: number;
  reasoning: string;
  model: string;
  error: string | null;
}

function errorMessage(kind: LLMErrorKind | "INTERNAL", detail: string): string {
  const human: Record<LLMErrorKind | "INTERNAL", string> = {
    NOT_CONFIGURED: "No AI provider configured",
    RATE_LIMIT: "AI providers rate-limited",
    TIMEOUT: "AI request timed out",
    UNAVAILABLE: "AI providers unavailable",
    BAD_RESPONSE: "AI returned invalid output twice",
    INTERNAL: "Unexpected error during AI classification",
  };
  return `${kind}: ${human[kind]}; rule-based classification applied.${detail ? ` (${detail.slice(0, 120)})` : ""}`;
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

    // Atomic claim: protects against double-runs (after() retries, double submits, two instances)
    // and doubles as the attempts counter. Tickets fully overridden by an admin are skipped:
    // spending tokens on a classification nobody will use is pure waste.
    const now = new Date();
    const claimed = await Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        $nor: [{ categorySource: "ADMIN", prioritySource: "ADMIN" }],
        $or: [{ "ai.lastAttemptAt": null }, { "ai.lastAttemptAt": { $lt: new Date(now.getTime() - claimWindowMs) } }],
      },
      { $set: { "ai.lastAttemptAt": now }, $inc: { "ai.attempts": 1 } },
      { returnDocument: "after", projection: { _id: 1 } },
    ).lean();
    if (!claimed) {
      logger.info("ai.classify_skipped", { ticketId, reason: "missing, admin-classified or already in progress" });
      return;
    }

    const ctx = await loadTicketContext(ticketId, now);
    if (!ctx) return;
    const { ticket, facts: factsInput } = ctx;
    const facts = computeFacts(factsInput);
    const input = { subject: ticket.subject, description: ticket.description };

    const outcome = await classifyWithFallback(ticketId, {
      ...input,
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
  t: { subject: string; description: string; context: string; royalty: RoyaltyFacts | null },
): Promise<Outcome> {
  const system = buildClassifySystemPrompt(publisherNames());
  const user = buildClassifyUserPrompt(t);
  let lastKind: LLMErrorKind = "UNAVAILABLE";
  let lastDetail = "";

  // At most 2 logical attempts, and the second only for malformed output (the provider was up).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await callLLM({
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
      return { source: "AI", ...res.value, model: res.model, error: null };
    } catch (e) {
      lastKind = isLLMError(e) ? e.kind : "UNAVAILABLE";
      lastDetail = isLLMError(e) ? "" : String(e);
      if (lastKind !== "BAD_RESPONSE") break;
    }
  }

  const rule = ruleClassify(t, { royalty: t.royalty });
  return { source: "RULE", ...rule, model: ruleEngineModel, error: errorMessage(lastKind, lastDetail) };
}

async function persist(
  ticketId: string,
  o: Outcome,
  prevCategory: string | null,
  prevPriority: string | null,
): Promise<void> {
  const _id = new mongoose.Types.ObjectId(ticketId);
  // Three guarded updates in one round trip. The ADMIN guards live in the FILTER, so an admin
  // override that lands while the LLM call was in flight is still never overwritten.
  await Ticket.bulkWrite(
    [
      {
        updateOne: {
          filter: { _id, categorySource: { $ne: "ADMIN" } },
          update: { $set: { category: o.category, categorySource: o.source } },
        },
      },
      {
        updateOne: {
          filter: { _id, prioritySource: { $ne: "ADMIN" } },
          update: { $set: { priority: o.priority, prioritySource: o.source, priorityRank: priorityRankByLevel[o.priority] } },
        },
      },
      {
        updateOne: {
          filter: { _id },
          update: {
            $set: {
              "ai.status": o.source === "AI" ? "DONE" : "FAILED",
              "ai.confidence": o.confidence,
              "ai.reasoning": o.reasoning,
              "ai.model": o.model,
              "ai.error": o.error,
              // Kept even when an admin value wins: suggested vs final = override-rate metric.
              "ai.suggestedCategory": o.category,
              "ai.suggestedPriority": o.priority,
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
    actorName: o.source === "AI" ? "AI" : "Rule engine",
    from: prevCategory || prevPriority ? `${prevCategory ?? "—"} / ${prevPriority ?? "—"}` : null,
    to: `${o.category} / ${o.priority}`,
  });
}
