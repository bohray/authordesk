import "server-only";
import { env } from "@/server/config/env";
import {
  LLMError,
  errorFromStatus,
  isAbortError,
  type LLMProvider,
  type LLMRequest,
  type LLMResponse,
  type ModelTier,
} from "./llmProvider";

const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

interface GroqChatResponse {
  model?: string;
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const secs = Number(header);
  return Number.isFinite(secs) ? Math.round(secs * 1000) : null;
}

/**
 * Secondary provider: Groq (free tier, very low latency, OpenAI-compatible).
 * Plain fetch instead of an SDK: one endpoint, zero extra dependencies or bundle weight.
 * Groq exposes a single configured model for both tiers.
 */
export class GroqProvider implements LLMProvider {
  readonly name = "groq";

  isConfigured(): boolean {
    return !!env().GROQ_API_KEY?.trim();
  }

  modelFor(tier: ModelTier): string {
    void tier;
    return env().GROQ_MODEL;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const key = env().GROQ_API_KEY?.trim();
    if (!key) throw new LLMError("NOT_CONFIGURED", "GROQ_API_KEY is not set", { provider: this.name });
    const model = this.modelFor(req.tier);

    let res: Response;
    try {
      res = await fetch(groqUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          max_tokens: req.maxOutputTokens,
          temperature: req.temperature,
          // json_object (not json_schema) is supported by every Groq model; the schema is
          // still enforced afterwards by Zod in the calling service.
          ...(req.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: req.signal,
      });
    } catch (e) {
      if (isAbortError(e)) throw new LLMError("TIMEOUT", "Groq request timed out", { provider: this.name });
      throw new LLMError("UNAVAILABLE", `Groq network error: ${String((e as Error)?.message ?? e).slice(0, 160)}`, {
        provider: this.name,
      });
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw errorFromStatus(
        this.name,
        res.status,
        `Groq HTTP ${res.status}: ${body.slice(0, 160)}`,
        parseRetryAfter(res.headers.get("retry-after")),
      );
    }

    let json: GroqChatResponse;
    try {
      json = (await res.json()) as GroqChatResponse;
    } catch {
      throw new LLMError("BAD_RESPONSE", "Groq returned non-JSON body", { provider: this.name });
    }
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new LLMError("BAD_RESPONSE", "Groq returned no content", { provider: this.name });
    return {
      text,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      model: json.model ?? model,
    };
  }
}
