import { describe, expect, it } from "vitest";
import { errorText, isAbortError, providerErrorMaxChars } from "@/server/ai/providers/llmProvider";
import { Errors } from "@/server/http/errors";
import { toErrorResponse } from "@/server/http/withApi";
import { loginWindowMs } from "@/server/lib/rateLimit";
import { msPerDay, msPerMinute, secondsPerHour } from "@/server/lib/time";
import { eventActor, newMessage } from "@/server/services/ticketActivity";
import type { Session } from "@/server/auth/session";

const session: Session = { userId: "665f1c2e8b3e4a0012345678", role: "ADMIN", name: "Aisha", email: "a@x.dev" };

describe("time units", () => {
  it("are consistent", () => {
    expect(msPerDay).toBe(86_400_000);
    expect(secondsPerHour).toBe(3600);
    expect(loginWindowMs).toBe(15 * msPerMinute);
  });
});

describe("provider error helpers", () => {
  it("errorText reads .message, falls back to the value and truncates", () => {
    expect(errorText(new Error("boom"))).toBe("boom");
    expect(errorText("plain")).toBe("plain");
    expect(errorText(null)).toBe("null");
    expect(errorText({ message: "x".repeat(500) })).toHaveLength(providerErrorMaxChars);
    expect(errorText(new Error("abcdef"), 3)).toBe("abc");
  });

  it("isAbortError recognises abort and timeout errors only", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError({ name: "TimeoutError" })).toBe(true);
    expect(isAbortError(new Error("nope"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe("toErrorResponse", () => {
  it("maps AppError to its status and envelope", async () => {
    const res = toErrorResponse(Errors.notFound("Ticket"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  });

  it("maps a Mongo duplicate-key error to 409 CONFLICT", async () => {
    const res = toErrorResponse({ code: 11000 });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CONFLICT");
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const res = toErrorResponse(new Error("secret detail"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("secret");
  });
});

describe("ticket activity builders", () => {
  it("eventActor takes the actor from the session", () => {
    expect(eventActor(session, "t1")).toEqual({ ticketId: "t1", actorId: session.userId, actorName: "Aisha" });
  });

  it("newMessage uses the given role and defaults aiAssisted to false", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const message = newMessage(session, "ADMIN", "Hello", { createdAt });
    expect(message).toMatchObject({ senderRole: "ADMIN", senderName: "Aisha", body: "Hello", aiAssisted: false, createdAt });
    expect(message.senderId.toString()).toBe(session.userId);
    expect(newMessage(session, "ADMIN", "Hi", { aiAssisted: true }).aiAssisted).toBe(true);
  });
});
