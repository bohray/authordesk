/**
 * Provider abstraction. Every LLM vendor is hidden behind this interface so the rest of
 * the AI layer (retry, fallback, circuit breaking, logging, prompts) is vendor-neutral and
 * a provider can be swapped or added without touching business code.
 */

/**
 * "small" = cheap/fast model for classification, "large" = better writer for drafts.
 * Providers map a tier to their own model id, so callers never hard-code model names.
 */
export type ModelTier = "small" | "large";

export interface LLMRequest {
  system: string;
  user: string;
  tier: ModelTier;
  /** "json" turns on the provider's JSON mode so output is machine-parseable. */
  responseFormat: "json" | "text";
  /** JSON Schema enforced natively where the provider supports it (Gemini). */
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens: number;
  temperature: number;
  /** Aborted by the client when the per-call timeout elapses. */
  signal: AbortSignal;
}

export interface LLMResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface LLMProvider {
  readonly name: string;
  /** True only when an API key is present. Unconfigured providers are skipped without a call. */
  isConfigured(): boolean;
  modelFor(tier: ModelTier): string;
  generate(req: LLMRequest): Promise<LLMResponse>;
}

export type LLMErrorKind = "RATE_LIMIT" | "TIMEOUT" | "UNAVAILABLE" | "BAD_RESPONSE" | "NOT_CONFIGURED";

export class LLMError extends Error {
  readonly kind: LLMErrorKind;
  /** Whether retrying the SAME provider can help (429 / 5xx yes; 401 / 400 no). */
  readonly retryable: boolean;
  /** Server-provided back-off hint, if any. */
  readonly retryAfterMs: number | null;
  readonly provider: string | null;

  constructor(
    kind: LLMErrorKind,
    message: string,
    opts: { retryable?: boolean; retryAfterMs?: number | null; provider?: string | null } = {},
  ) {
    super(message);
    this.name = "LLMError";
    this.kind = kind;
    this.retryable = opts.retryable ?? (kind === "RATE_LIMIT" || kind === "UNAVAILABLE");
    this.retryAfterMs = opts.retryAfterMs ?? null;
    this.provider = opts.provider ?? null;
  }
}

export function isLLMError(e: unknown): e is LLMError {
  return e instanceof LLMError;
}

/** Shared HTTP-status → error-kind mapping so both providers degrade identically. */
export function errorFromStatus(
  provider: string,
  status: number,
  message: string,
  retryAfterMs: number | null = null,
): LLMError {
  if (status === 429) return new LLMError("RATE_LIMIT", message, { provider, retryAfterMs });
  if (status >= 500) return new LLMError("UNAVAILABLE", message, { provider, retryAfterMs });
  // 400/401/403/404: retrying the same request cannot succeed (bad key, bad model, bad request),
  // but another provider might, so it is UNAVAILABLE and not retryable.
  return new LLMError("UNAVAILABLE", message, { provider, retryable: false });
}

/** Error names fetch / AbortSignal use when a request is cancelled or times out. */
const abortErrorNames: readonly unknown[] = ["AbortError", "TimeoutError"];

export function isAbortError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "name" in e && abortErrorNames.includes(e.name);
}

/**
 * Longest slice of a provider error message kept in logs and on the ticket. Messages can echo
 * request details, so only a short prefix is stored.
 */
export const providerErrorMaxChars = 160;

/** The `message` property of an unknown thrown value, if it has one. */
export function messageOf(e: unknown): unknown {
  return typeof e === "object" && e !== null && "message" in e ? e.message : undefined;
}

/** The message of an unknown thrown value (or the value itself), truncated to `maxChars`. */
export function errorText(e: unknown, maxChars = providerErrorMaxChars): string {
  return String(messageOf(e) ?? e).slice(0, maxChars);
}
