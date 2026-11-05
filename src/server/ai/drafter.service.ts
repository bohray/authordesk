import "server-only";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { AiDraft } from "@/server/db/models";
import { logger } from "@/server/lib/logger";
import type { TicketCategory } from "@/shared/constants/ticket";
import type { DraftDTO } from "@/shared/types/dto";
import { computeFacts, renderFactsBlock } from "./context/buildFacts";
import { loadTicketContext } from "./context/loadContext";
import { hasConfiguredProvider, callLLM } from "./llmClient";
import {
  draftMaxOutputTokens,
  draftPromptVersion,
  draftTemperature,
  buildDraftSystemPrompt,
  buildDraftUserPrompt,
  cleanDraft,
} from "./prompts/draft.prompt";
import { isLLMError } from "./providers/llmProvider";
import { ruleClassify } from "./ruleClassifier";

export const draftUnavailableMessage =
  "AI drafting is temporarily unavailable. Please write a reply manually.";
const notConfiguredMessage = "AI is not configured on this server. Please write a reply manually.";
const ticketNotFoundMessage = "Ticket not found.";

/** The "no draft" response; the admin UI shows `message` and falls back to a manual reply. */
export const unavailableDraft = (message: string = draftUnavailableMessage): DraftDTO => ({
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
  const request = generate(ticketId, !!opts.regenerate).finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

type TicketContext = NonNullable<Awaited<ReturnType<typeof loadTicketContext>>>;

/** A cached draft is valid until the thread grows. Serving it costs zero tokens. */
async function findFreshCachedDraft(ticketId: Types.ObjectId, messageCount: number): Promise<DraftDTO | null> {
  const cachedDraft = await AiDraft.findOne({ ticketId }).lean();
  if (!cachedDraft || cachedDraft.basedOnMessageCount !== messageCount) return null;
  return {
    content: cachedDraft.content,
    status: "READY",
    model: cachedDraft.model,
    generatedAt: (cachedDraft.updatedAt ?? cachedDraft.createdAt ?? new Date()).toISOString(),
    cached: true,
  };
}

function buildDraftPrompts({ ticket, facts: factsInput }: TicketContext) {
  // If classification hasn't landed yet, pick KB sections via the free rule engine.
  const category: TicketCategory =
    ticket.category ?? ruleClassify({ subject: ticket.subject, description: ticket.description }).category;
  const publisher = factsInput.publisher;
  return {
    system: buildDraftSystemPrompt(publisher),
    user: buildDraftUserPrompt({
      publisher,
      category,
      factsBlock: renderFactsBlock(factsInput, computeFacts(factsInput)),
      subject: ticket.subject,
      description: ticket.description,
      messages: (ticket.messages ?? []).map((message) => ({
        role: message.senderRole === "AUTHOR" ? "AUTHOR" : "ADMIN",
        body: message.body,
      })),
    }),
  };
}

async function generate(ticketId: string, regenerate: boolean): Promise<DraftDTO> {
  try {
    await connectDB();
    if (!mongoose.isValidObjectId(ticketId)) return unavailableDraft(ticketNotFoundMessage);
    const context = await loadTicketContext(ticketId);
    if (!context) return unavailableDraft(ticketNotFoundMessage);
    const { ticket } = context;
    const messageCount = (ticket.messages ?? []).length;

    if (!regenerate) {
      const cached = await findFreshCachedDraft(ticket._id, messageCount);
      if (cached) return cached;
    }

    if (!hasConfiguredProvider()) return unavailableDraft(notConfiguredMessage);

    const { system, user } = buildDraftPrompts(context);
    const result = await callLLM({
      operation: "DRAFT",
      ticketId,
      tier: "large",
      system,
      user,
      responseFormat: "text",
      maxOutputTokens: draftMaxOutputTokens,
      temperature: draftTemperature, // a little variety reads human; facts are pinned by the prompt
      parse: cleanDraft,
    });

    const saved = await AiDraft.findOneAndUpdate(
      { ticketId: ticket._id },
      {
        $set: {
          content: result.value,
          model: result.model,
          provider: result.provider,
          promptVersion: draftPromptVersion,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          basedOnMessageCount: messageCount,
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    logger.info("ai.drafted", {
      ticketId,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      chars: result.value.length,
      regenerate,
    });
    return {
      content: result.value,
      status: "READY",
      model: result.model,
      generatedAt: (saved?.updatedAt ?? new Date()).toISOString(),
      cached: false,
    };
  } catch (err) {
    if (isLLMError(err)) {
      logger.warn("ai.draft_unavailable", { ticketId, kind: err.kind });
      return unavailableDraft(err.kind === "NOT_CONFIGURED" ? notConfiguredMessage : draftUnavailableMessage);
    }
    logger.error("ai.draft_crashed", { ticketId, error: String(err) });
    return unavailableDraft();
  }
}
