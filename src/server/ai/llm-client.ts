import "server-only";
import { env } from "@/server/config/env";
import { logger } from "@/server/lib/logger";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { LLMError, isLLMError, type LLMProvider, type LLMRequest, type ModelTier } from "./providers/llm-provider";
import { logUsage, type AiOperation } from "./usage-logger";

/* ------------------------------------------------------------------ */
/* Tunables                                                           */
/* ------------------------------------------------------------------ */
/** Retries on the SAME provider for transient errors (so up to 3 attempts per provider). */
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 400;
/**
 * Longest server-requested wait we honour. If a provider says "retry in 30s" we do not
 * sit on a serverless invocation; we fall through to the next provider instead.
 */
const MAX_RETRY_AFTER_MS = 4_000;
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 60_000;

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
const sleep = (ms: number) => (overrides.sleep ?? ((t: number) => new Promise((r) => setTimeout(r, t))))(ms);
const now = () => (overrides.now ?? Date.now)();

export function hasConfiguredProvider(): boolean {
  return providers().some((p) => p.isConfigured());
}

/* ------------------------------------------------------------------ */
/* Circuit breaker (per provider, per server instance)                */
/* ------------------------------------------------------------------ */
/**
 * Why: when a free tier is exhausted every call fails slowly. After 3 consecutive failures we
 * stop calling that provider for 60s (go straight to the fallback / rule engine), then let a
 * single "half-open" probe through. A success closes the circuit; a failure re-opens it.
 */
interface BreakerState {
  failures: number;
  openUntil: number;
  probeInFlight: boolean;
}
const breakers = new Map<string, BreakerState>();

function breaker(name: string): BreakerState {
  let b = breakers.get(name);
  if (!b) {
    b = { failures: 0, openUntil: 0, probeInFlight: false };
    breakers.set(name, b);
  }
  return b;
}

export function resetCircuitBreakers() {
  breakers.clear();
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
export function getCircuitState(name: string): CircuitState {
  const b = breaker(name);
  if (b.failures < BREAKER_THRESHOLD) return "CLOSED";
  return now() < b.openUntil ? "OPEN" : "HALF_OPEN";
}

/** Returns false if the provider must be skipped right now. Claims the probe slot if half-open. */
function breakerAllows(name: string): boolean {
  const state = getCircuitState(name);
  if (state === "CLOSED") return true;
  if (state === "OPEN") return false;
  const b = breaker(name);
  if (b.probeInFlight) return false;
  b.probeInFlight = true;
  return true;
}

function recordSuccess(name: string) {
  breakers.set(name, { failures: 0, openUntil: 0, probeInFlight: false });
}

function recordFailure(name: string) {
  const b = breaker(name);
  b.failures += 1;
  b.probeInFlight = false;
  if (b.failures >= BREAKER_THRESHOLD) {
    const wasOpen = b.openUntil > 0;
    b.openUntil = now() + BREAKER_COOLDOWN_MS;
    logger.warn(wasOpen ? "ai.circuit_reopened" : "ai.circuit_opened", { provider: name, failures: b.failures });
  }
}

/* ------------------------------------------------------------------ */
/* Single attempt with a hard timeout                                 */
/* ------------------------------------------------------------------ */
async function attemptWithTimeout(provider: LLMProvider, req: Omit<LLMRequest, "signal">) {
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

function backoffMs(retry: number, err: LLMError): number | null {
  if (err.retryAfterMs != null) return err.retryAfterMs > MAX_RETRY_AFTER_MS ? null : err.retryAfterMs;
  const exp = BASE_BACKOFF_MS * 2 ** retry;
  const jitter = (overrides.random ?? Math.random)() * exp * 0.5; // de-synchronise concurrent retries
  return Math.round(exp + jitter);
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

/**
 * Run one logical LLM call through the fallback chain.
 *  - per attempt: hard timeout (AI_TIMEOUT_MS)
 *  - RATE_LIMIT / UNAVAILABLE: up to 2 retries with exponential backoff + jitter (or retry-after, capped)
 *  - TIMEOUT / BAD_RESPONSE / non-retryable: move straight to the next provider
 *  - every real attempt is written to AiUsageLog (fire-and-forget)
 * Throws an LLMError only when every provider failed or none is configured.
 */
export async function callLLM<T>(opts: LLMCallOptions<T>): Promise<LLMCallResult<T>> {
  const { operation, parse, ticketId = null, ...rest } = opts;
  const req = { ...rest };
  let lastError: LLMError | null = null;
  let anyConfigured = false;

  for (const provider of providers()) {
    if (!provider.isConfigured()) continue;
    anyConfigured = true;

    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      if (!breakerAllows(provider.name)) {
        lastError ??= new LLMError("UNAVAILABLE", `${provider.name} circuit open`, { provider: provider.name });
        break;
      }
      const model = provider.modelFor(req.tier);
      const started = now();
      let tokens = { inputTokens: 0, outputTokens: 0 };
      try {
        const res = await attemptWithTimeout(provider, req);
        tokens = { inputTokens: res.inputTokens, outputTokens: res.outputTokens };
        let value: T;
        try {
          value = parse(res.text);
        } catch (e) {
          throw new LLMError("BAD_RESPONSE", `Invalid model output: ${String((e as Error)?.message ?? e).slice(0, 120)}`, {
            provider: provider.name,
            retryable: false,
          });
        }
        const latencyMs = now() - started;
        recordSuccess(provider.name);
        logUsage({ operation, provider: provider.name, model: res.model, ticketId, ...tokens, latencyMs, success: true, errorCode: null });
        return { value, provider: provider.name, model: res.model, ...tokens, latencyMs };
      } catch (e) {
        const err = isLLMError(e)
          ? e
          : new LLMError("UNAVAILABLE", String((e as Error)?.message ?? e).slice(0, 160), { provider: provider.name });
        lastError = err;
        // Tokens are still billed for a bad response, so they are logged on failure too.
        logUsage({ operation, provider: provider.name, model, ticketId, ...tokens, latencyMs: now() - started, success: false, errorCode: err.kind });

        // A model producing malformed output says nothing about availability: keep the circuit as is.
        if (err.kind === "BAD_RESPONSE") {
          breaker(provider.name).probeInFlight = false;
          break;
        }
        recordFailure(provider.name);
        if (!err.retryable || retry === MAX_RETRIES) break;
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
