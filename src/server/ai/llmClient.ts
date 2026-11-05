import "server-only";
import { env } from "@/server/config/env";
import { logger } from "@/server/lib/logger";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import {
  LLMError,
  errorText,
  isLLMError,
  type LLMProvider,
  type LLMRequest,
  type ModelTier,
} from "./providers/llmProvider";
import { logUsage, type AiOperation } from "./usageLogger";

/* ------------------------------------------------------------------ */
/* Tunables                                                           */
/* ------------------------------------------------------------------ */
/** Retries on the SAME provider for transient errors (so up to 3 attempts per provider). */
const maxRetries = 2;
const baseBackoffMs = 400;
/** Random extra wait of up to this share of the backoff, so concurrent retries de-synchronise. */
const backoffJitterRatio = 0.5;
/**
 * Longest server-requested wait we honour. If a provider says "retry in 30s" we do not
 * sit on a serverless invocation; we fall through to the next provider instead.
 */
const maxRetryAfterMs = 4_000;
const breakerThreshold = 3;
const breakerCooldownMs = 60_000;
/** Parser error detail kept in a BAD_RESPONSE message. */
const parseErrorMaxChars = 120;

/* ------------------------------------------------------------------ */
/* Dependency injection (tests)                                       */
/* ------------------------------------------------------------------ */
interface ClientOverrides {
  providers?: LLMProvider[];
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
  random?: () => number;
}
let overrides: ClientOverrides = {};
let defaultProviders: LLMProvider[] | null = null;

/** Inject fake providers / clock / sleep. Pass null to restore real providers. */
export function setLLMClientOverrides(o: ClientOverrides | null) {
  overrides = o ?? {};
  resetCircuitBreakers();
}

/** Convenience alias used by tests. */
export function setProvidersForTesting(providers: LLMProvider[] | null) {
  setLLMClientOverrides(providers ? { ...overrides, providers } : null);
}

/** Fallback chain order: Gemini (primary) then Groq. */
function providers(): LLMProvider[] {
  if (overrides.providers) return overrides.providers;
  defaultProviders ??= [new GeminiProvider(), new GroqProvider()];
  return defaultProviders;
}
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const sleep = (ms: number) => (overrides.sleep ?? realSleep)(ms);
const now = () => (overrides.now ?? Date.now)();

export function hasConfiguredProvider(): boolean {
  return providers().some((provider) => provider.isConfigured());
}

/* ------------------------------------------------------------------ */
/* Circuit breaker (per provider, per server instance)                */
/* ------------------------------------------------------------------ */
/**
 * Why: when a free tier is exhausted every call fails slowly. After `breakerThreshold`
 * consecutive failures we stop calling that provider for `breakerCooldownMs` (go straight to
 * the fallback / rule engine), then let a
 * single "half-open" probe through. A success closes the circuit; a failure re-opens it.
 */
interface BreakerState {
  failures: number;
  openUntil: number;
  probeInFlight: boolean;
}
const breakers = new Map<string, BreakerState>();

const closedBreaker = (): BreakerState => ({ failures: 0, openUntil: 0, probeInFlight: false });

function breaker(name: string): BreakerState {
  let state = breakers.get(name);
  if (!state) {
    state = closedBreaker();
    breakers.set(name, state);
  }
  return state;
}

export function resetCircuitBreakers() {
  breakers.clear();
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
export function getCircuitState(name: string): CircuitState {
  const state = breaker(name);
  if (state.failures < breakerThreshold) return "CLOSED";
  return now() < state.openUntil ? "OPEN" : "HALF_OPEN";
}

/** Returns false if the provider must be skipped right now. Claims the probe slot if half-open. */
function breakerAllows(name: string): boolean {
  const state = getCircuitState(name);
  if (state === "CLOSED") return true;
  if (state === "OPEN") return false;
  const probe = breaker(name);
  if (probe.probeInFlight) return false;
  probe.probeInFlight = true;
  return true;
}

function recordSuccess(name: string) {
  breakers.set(name, closedBreaker());
}

function recordFailure(name: string) {
  const state = breaker(name);
  state.failures += 1;
  state.probeInFlight = false;
  if (state.failures >= breakerThreshold) {
    const wasOpen = state.openUntil > 0;
    state.openUntil = now() + breakerCooldownMs;
    logger.warn(wasOpen ? "ai.circuit_reopened" : "ai.circuit_opened", { provider: name, failures: state.failures });
  }
}

/** A malformed answer says nothing about availability: free the probe slot, keep the count. */
function releaseProbe(name: string) {
  breaker(name).probeInFlight = false;
}

/* ------------------------------------------------------------------ */
/* Single attempt with a hard timeout                                 */
/* ------------------------------------------------------------------ */
async function attemptWithTimeout(provider: LLMProvider, req: AttemptRequest) {
  const timeoutMs = overrides.timeoutMs ?? env().AI_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Race as well as abort: even if a provider ignores the signal, the caller is released on time.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new LLMError("TIMEOUT", `${provider.name} timed out after ${timeoutMs}ms`, { provider: provider.name }));
    }, timeoutMs);
  });
  try {
    return await Promise.race([provider.generate({ ...req, signal: controller.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Wait before the next retry, or null when the provider asked for longer than we will wait. */
function backoffMs(retry: number, err: LLMError): number | null {
  if (err.retryAfterMs != null) return err.retryAfterMs > maxRetryAfterMs ? null : err.retryAfterMs;
  const exponential = baseBackoffMs * 2 ** retry;
  const jitter = (overrides.random ?? Math.random)() * exponential * backoffJitterRatio;
  return Math.round(exponential + jitter);
}

function toLLMError(e: unknown, provider: string): LLMError {
  return isLLMError(e) ? e : new LLMError("UNAVAILABLE", errorText(e), { provider });
}

function parseOrThrow<T>(parse: (text: string) => T, text: string, provider: string): T {
  try {
    return parse(text);
  } catch (e) {
    throw new LLMError("BAD_RESPONSE", `Invalid model output: ${errorText(e, parseErrorMaxChars)}`, {
      provider,
      retryable: false,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */
export interface LLMCallOptions<T> {
  operation: AiOperation;
  ticketId?: string | null;
  tier: ModelTier;
  system: string;
  user: string;
  responseFormat: "json" | "text";
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens: number;
  temperature: number;
  /** Validate/parse the raw text. Throwing marks the attempt BAD_RESPONSE and tries the next provider. */
  parse: (text: string) => T;
}

export interface LLMCallResult<T> {
  value: T;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

type AttemptRequest = Omit<LLMRequest, "signal">;

interface AttemptContext<T> {
  operation: AiOperation;
  ticketId: string | null;
  parse: (text: string) => T;
}

/**
 * One attempt on one provider: call with timeout, parse, update the breaker on success and
 * log usage either way. Always throws an LLMError on failure.
 */
async function attemptOnce<T>(
  provider: LLMProvider,
  req: AttemptRequest,
  { operation, ticketId, parse }: AttemptContext<T>,
): Promise<LLMCallResult<T>> {
  const model = provider.modelFor(req.tier);
  const started = now();
  let tokens = { inputTokens: 0, outputTokens: 0 };
  try {
    const res = await attemptWithTimeout(provider, req);
    tokens = { inputTokens: res.inputTokens, outputTokens: res.outputTokens };
    const value = parseOrThrow(parse, res.text, provider.name);
    const latencyMs = now() - started;
    recordSuccess(provider.name);
    logUsage({ operation, provider: provider.name, model: res.model, ticketId, ...tokens, latencyMs, success: true, errorCode: null });
    return { value, provider: provider.name, model: res.model, ...tokens, latencyMs };
  } catch (e) {
    const err = toLLMError(e, provider.name);
    // Tokens are still billed for a bad response, so they are logged on failure too.
    logUsage({ operation, provider: provider.name, model, ticketId, ...tokens, latencyMs: now() - started, success: false, errorCode: err.kind });
    throw err;
  }
}

/**
 * Run one logical LLM call through the fallback chain.
 *  - per attempt: hard timeout (AI_TIMEOUT_MS)
 *  - RATE_LIMIT / UNAVAILABLE: up to `maxRetries` retries with exponential backoff + jitter
 *    (or retry-after, capped)
 *  - TIMEOUT / BAD_RESPONSE / non-retryable: move straight to the next provider
 *  - every real attempt is written to AiUsageLog (fire-and-forget)
 * Throws an LLMError only when every provider failed or none is configured.
 */
export async function callLLM<T>(opts: LLMCallOptions<T>): Promise<LLMCallResult<T>> {
  const { operation, parse, ticketId = null, ...req } = opts;
  const context: AttemptContext<T> = { operation, ticketId, parse };
  let lastError: LLMError | null = null;
  let anyConfigured = false;

  for (const provider of providers()) {
    if (!provider.isConfigured()) continue;
    anyConfigured = true;

    for (let retry = 0; retry <= maxRetries; retry++) {
      if (!breakerAllows(provider.name)) {
        lastError ??= new LLMError("UNAVAILABLE", `${provider.name} circuit open`, { provider: provider.name });
        break;
      }
      try {
        return await attemptOnce(provider, req, context);
      } catch (e) {
        const err = toLLMError(e, provider.name);
        lastError = err;
        if (err.kind === "BAD_RESPONSE") {
          releaseProbe(provider.name);
          break;
        }
        recordFailure(provider.name);
        if (!err.retryable || retry === maxRetries) break;
        const wait = backoffMs(retry, err);
        if (wait == null) break; // provider asked for a long pause: fail over instead of waiting
        await sleep(wait);
      }
    }
    logger.warn("ai.provider_failed_over", { operation, provider: provider.name, kind: lastError?.kind, ticketId });
  }

  if (!anyConfigured) throw new LLMError("NOT_CONFIGURED", "No AI provider is configured", { retryable: false });
  throw lastError ?? new LLMError("UNAVAILABLE", "All AI providers failed", { retryable: false });
}
