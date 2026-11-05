import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { AiDraft } from "@/server/db/models";
import { logger } from "@/server/lib/logger";
import type { TicketCategory } from "@/shared/constants/ticket";
import type { DraftDTO } from "@/shared/types/dto";
import { computeFacts, renderFactsBlock } from "./context/build-facts";
import { loadTicketContext } from "./context/load-context";
import { hasConfiguredProvider, callLLM } from "./llm-client";
import {
  DRAFT_MAX_OUTPUT_TOKENS,
  DRAFT_PROMPT_VERSION,
  DRAFT_TEMPERATURE,
  buildDraftSystemPrompt,
  buildDraftUserPrompt,
  cleanDraft,
} from "./prompts/draft.prompt";
import { isLLMError } from "./providers/llm-provider";
import { ruleClassify } from "./rule-classifier";

const MSG_UNAVAILABLE = "AI drafting is temporarily unavailable. Please write a reply manually.";
const MSG_NOT_CONFIGURED = "AI is not configured on this server. Please write a reply manually.";

const unavailable = (message: string): DraftDTO => ({
  content: null,
  status: "UNAVAILABLE",
  model: null,
  generatedAt: null,
  cached: false,
  message,
});

/**
 * Collapse concurrent requests for the same ticket (two agents opening it, double clicks)
 * into one LLM call per server instance.
 */
const inflight = new Map<string, Promise<DraftDTO>>();

export async function getDraftForTicketImpl(ticketId: string, opts: { regenerate?: boolean } = {}): Promise<DraftDTO> {
  const key = `${ticketId}:${opts.regenerate ? "regen" : "get"}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = generate(ticketId, !!opts.regenerate).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function generate(ticketId: string, regenerate: boolean): Promise<DraftDTO> {
  try {
    await connectDB();
    if (!mongoose.isValidObjectId(ticketId)) return unavailable("Ticket not found.");
    const ctx = await loadTicketContext(ticketId);
    if (!ctx) return unavailable("Ticket not found.");
    const { ticket, facts: factsInput } = ctx;
    const messages = ticket.messages ?? [];

    // Cache: a draft is valid until the thread grows. Serving it costs zero tokens.
    const cachedDraft = await AiDraft.findOne({ ticketId: ticket._id }).lean();
    if (cachedDraft && !regenerate && cachedDraft.basedOnMessageCount === messages.length) {
      return {
        content: cachedDraft.content,
        status: "READY",
        model: cachedDraft.model,
        generatedAt: (cachedDraft.updatedAt ?? cachedDraft.createdAt ?? new Date()).toISOString(),
        cached: true,
      };
    }

    if (!hasConfiguredProvider()) return unavailable(MSG_NOT_CONFIGURED);

    // If classification hasn't landed yet, pick KB sections via the free rule engine.
    const category: TicketCategory =
      (ticket.category as TicketCategory | null) ?? ruleClassify({ subject: ticket.subject, description: ticket.description }).category;
    const facts = computeFacts(factsInput);
    const publisher = factsInput.publisher;

    const system = buildDraftSystemPrompt(publisher);
    const user = buildDraftUserPrompt({
      publisher,
      category,
      factsBlock: renderFactsBlock(factsInput, facts),
      subject: ticket.subject,
      description: ticket.description,
      messages: messages.map((m) => ({ role: m.senderRole === "AUTHOR" ? "AUTHOR" : "ADMIN", body: m.body })),
    });

    const res = await callLLM({
      operation: "DRAFT",
      ticketId,
      tier: "large",
      system,
      user,
      responseFormat: "text",
      maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS,
      temperature: DRAFT_TEMPERATURE, // a little variety reads human; facts are pinned by the prompt
      parse: cleanDraft,
    });

    const saved = await AiDraft.findOneAndUpdate(
      { ticketId: ticket._id },
      {
        $set: {
          content: res.value,
          model: res.model,
          provider: res.provider,
          promptVersion: DRAFT_PROMPT_VERSION,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
          basedOnMessageCount: messages.length,
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    logger.info("ai.drafted", {
      ticketId,
      provider: res.provider,
      model: res.model,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      chars: res.value.length,
      regenerate,
    });
    return {
      content: res.value,
      status: "READY",
      model: res.model,
      generatedAt: (saved?.updatedAt ?? new Date()).toISOString(),
      cached: false,
    };
  } catch (err) {
    if (isLLMError(err)) {
      logger.warn("ai.draft_unavailable", { ticketId, kind: err.kind });
      return unavailable(err.kind === "NOT_CONFIGURED" ? MSG_NOT_CONFIGURED : MSG_UNAVAILABLE);
    }
    logger.error("ai.draft_crashed", { ticketId, error: String(err) });
    return unavailable(MSG_UNAVAILABLE);
  }
}
