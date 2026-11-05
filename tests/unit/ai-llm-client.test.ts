import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { callLLM, getCircuitState, hasConfiguredProvider, setLLMClientOverrides } from "@/server/ai/llm-client";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "@/server/ai/providers/llm-provider";
import { setUsageSinkForTesting, type UsageEntry } from "@/server/ai/usage-logger";

type Behaviour = (req: LLMRequest) => Promise<LLMResponse>;

function fake(name: string, behaviour: Behaviour, configured = true) {
  const p = {
    name,
    calls: 0,
    isConfigured: () => configured,
    modelFor: () => `${name}-model`,
    async generate(req: LLMRequest) {
      p.calls++;
      return behaviour(req);
    },
  };
  return p satisfies LLMProvider & { calls: number };
}
const ok = (text = '{"ok":true}'): Behaviour => async () => ({ text, inputTokens: 100, outputTokens: 10, model: "m" });
const fail = (kind: LLMError["kind"], retryAfterMs: number | null = null): Behaviour => async () => {
  throw new LLMError(kind, kind, { retryAfterMs });
};

const call = () =>
  callLLM({
    operation: "CLASSIFY",
    ticketId: null,
    tier: "small",
    system: "s",
    user: "u",
    responseFormat: "json",
    maxOutputTokens: 50,
    temperature: 0,
    parse: (t) => JSON.parse(t) as { ok: boolean },
  });

let clock = 1_000_000;
let sleeps: number[] = [];
let usage: UsageEntry[] = [];

function setup(providers: LLMProvider[], timeoutMs = 1000) {
  setLLMClientOverrides({
    providers,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
    timeoutMs,
  });
}

beforeEach(() => {
  clock = 1_000_000;
  sleeps = [];
  usage = [];
  setUsageSinkForTesting((e) => usage.push(e));
});
afterEach(() => {
  setLLMClientOverrides(null);
  setUsageSinkForTesting(null);
});

describe("llm-client", () => {
  it("returns the primary provider's parsed result and logs one successful attempt", async () => {
    const a = fake("a", ok());
    setup([a, fake("b", ok())]);
    const res = await call();
    expect(res).toMatchObject({ value: { ok: true }, provider: "a", inputTokens: 100, outputTokens: 10 });
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ provider: "a", success: true, operation: "CLASSIFY" });
  });

  it("retries RATE_LIMIT with backoff, then falls back to the second provider", async () => {
    const a = fake("a", fail("RATE_LIMIT"));
    const b = fake("b", ok());
    setup([a, b]);
    const res = await call();
    expect(res.provider).toBe("b");
    expect(a.calls).toBe(3); // 1 + 2 retries
    expect(sleeps).toHaveLength(2);
    expect(sleeps[1]).toBeGreaterThan(sleeps[0]); // exponential
    expect(usage.map((u) => [u.provider, u.success, u.errorCode])).toEqual([
      ["a", false, "RATE_LIMIT"],
      ["a", false, "RATE_LIMIT"],
      ["a", false, "RATE_LIMIT"],
      ["b", true, null],
    ]);
  });

  it("fails over immediately when retry-after exceeds the cap", async () => {
    const a = fake("a", fail("RATE_LIMIT", 30_000));
    setup([a, fake("b", ok())]);
    expect((await call()).provider).toBe("b");
    expect(a.calls).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it("opens the circuit after 3 consecutive failures, skips for 60s, then half-opens", async () => {
    const a = fake("a", fail("UNAVAILABLE"));
    const b = fake("b", ok());
    setup([a, b]);
    await call();
    expect(getCircuitState("a")).toBe("OPEN");

    await call(); // circuit open: a is not called at all
    expect(a.calls).toBe(3);

    clock += 61_000;
    expect(getCircuitState("a")).toBe("HALF_OPEN");
    await call(); // a single probe, fails → re-opens without further retries
    expect(a.calls).toBe(4);
    expect(getCircuitState("a")).toBe("OPEN");
  });

  it("a successful half-open probe closes the circuit", async () => {
    let healthy = false;
    const a = fake("a", async (r) => (healthy ? ok()(r) : fail("UNAVAILABLE")(r)));
    setup([a, fake("b", ok())]);
    await call();
    clock += 61_000;
    healthy = true;
    expect((await call()).provider).toBe("a");
    expect(getCircuitState("a")).toBe("CLOSED");
  });

  it("times out a hanging provider as TIMEOUT and moves on", async () => {
    const hang = fake("slow", () => new Promise<LLMResponse>(() => {}));
    setup([hang], 20);
    await expect(call()).rejects.toMatchObject({ kind: "TIMEOUT" });
    expect(hang.calls).toBe(1); // timeouts are not retried on the same provider
    expect(usage[0]).toMatchObject({ success: false, errorCode: "TIMEOUT" });
  });

  it("treats unparseable output as BAD_RESPONSE and tries the next provider without tripping the breaker", async () => {
    const a = fake("a", ok("not json"));
    setup([a, fake("b", ok())]);
    expect((await call()).provider).toBe("b");
    expect(usage[0]).toMatchObject({ provider: "a", errorCode: "BAD_RESPONSE", inputTokens: 100 });
    expect(getCircuitState("a")).toBe("CLOSED");
  });

  it("throws NOT_CONFIGURED without making any call when no provider has a key", async () => {
    const a = fake("a", ok(), false);
    setup([a]);
    expect(hasConfiguredProvider()).toBe(false);
    await expect(call()).rejects.toMatchObject({ kind: "NOT_CONFIGURED" });
    expect(a.calls).toBe(0);
    expect(usage).toHaveLength(0);
  });

  it("real providers report unconfigured when no keys are set", () => {
    setLLMClientOverrides(null);
    expect(hasConfiguredProvider()).toBe(false);
  });
});
