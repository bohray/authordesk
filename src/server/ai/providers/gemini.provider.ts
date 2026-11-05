import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "@/server/config/env";
import {
  LLMError,
  errorFromStatus,
  isAbortError,
  type LLMProvider,
  type LLMRequest,
  type LLMResponse,
  type ModelTier,
} from "./llm-provider";

/** Gemini errors embed `"retryDelay": "23s"` in the message body for 429s. */
function parseRetryDelay(message: string): number | null {
  const m = /retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/.exec(message);
  return m ? Math.round(parseFloat(m[1]) * 1000) : null;
}

/**
 * Primary provider: Google Gemini (free tier, native JSON-schema output, large context).
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;
  private clientKey: string | null = null;

  isConfigured(): boolean {
    return !!env().GEMINI_API_KEY?.trim();
  }

  modelFor(tier: ModelTier): string {
    return tier === "small" ? env().GEMINI_CLASSIFY_MODEL : env().GEMINI_DRAFT_MODEL;
  }

  private getClient(): GoogleGenAI {
    const key = env().GEMINI_API_KEY?.trim();
    if (!key) throw new LLMError("NOT_CONFIGURED", "GEMINI_API_KEY is not set", { provider: this.name });
    if (!this.client || this.clientKey !== key) {
      this.client = new GoogleGenAI({ apiKey: key });
      this.clientKey = key;
    }
    return this.client;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const model = this.modelFor(req.tier);
    try {
      const res = await this.getClient().models.generateContent({
        model,
        contents: req.user,
        config: {
          systemInstruction: req.system,
          maxOutputTokens: req.maxOutputTokens,
          temperature: req.temperature,
          // Thinking tokens are billed as output and count against maxOutputTokens; for
          // classification and short replies they add cost/latency without measurable gain.
          // Gemini 3.x uses `thinkingLevel` (MINIMAL ≈ no thoughts); the 2.5-era
          // `thinkingBudget: 0` is rejected with 400 by gemini-3.5-flash-lite.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          ...(req.responseFormat === "json"
            ? { responseMimeType: "application/json", responseJsonSchema: req.jsonSchema }
            : {}),
          abortSignal: req.signal,
          // The SDK only retries when retryOptions is set; leave it unset so the llm-client
          // owns retry/backoff/fallback in one place (no hidden multiplicative retries).
          httpOptions: { timeout: env().AI_TIMEOUT_MS },
        },
      });
      const text = res.text?.trim() ?? "";
      if (!text) {
        const reason = res.candidates?.[0]?.finishReason ?? "EMPTY";
        throw new LLMError("BAD_RESPONSE", `Gemini returned no text (${reason})`, { provider: this.name });
      }
      return {
        text,
        inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
        model,
      };
    } catch (e) {
      throw this.mapError(e);
    }
  }

  private mapError(e: unknown): LLMError {
    if (e instanceof LLMError) return e;
    if (isAbortError(e) || /aborted|timed? ?out/i.test(String((e as Error)?.message ?? ""))) {
      return new LLMError("TIMEOUT", "Gemini request timed out", { provider: this.name });
    }
    if (e instanceof ApiError) {
      // Message may contain request details; keep only a short prefix for logs/DB.
      const msg = `Gemini HTTP ${e.status}: ${e.message.slice(0, 160)}`;
      return errorFromStatus(this.name, e.status, msg, parseRetryDelay(e.message));
    }
    return new LLMError("UNAVAILABLE", `Gemini network error: ${String((e as Error)?.message ?? e).slice(0, 160)}`, {
      provider: this.name,
    });
  }
}
