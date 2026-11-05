import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { classifyTicket } from "@/server/ai";
import { setLLMClientOverrides } from "@/server/ai/llm-client";
import type { LLMProvider, LLMRequest } from "@/server/ai/providers/llm-provider";
import { flushUsageLogs } from "@/server/ai/usage-logger";
import { AiUsageLog, Book, Ticket, TicketEvent, User } from "@/server/db/models";
import { startTestDb, stopTestDb } from "../helpers/test-db";

let n = 9000;
async function makeTicket(opts: {
  bookCode?: string | null;
  subject: string;
  description: string;
  extra?: Record<string, unknown>;
}) {
  const book = opts.bookCode ? await Book.findOne({ code: opts.bookCode }).lean() : null;
  const author = book
    ? await User.findById(book.authorId).lean()
    : await User.findOne({ "authorProfile.code": "AUTH001" }).lean();
  const t = await Ticket.create({
    ticketNumber: `T-${++n}`,
    authorId: author!._id,
    bookId: book?._id ?? null,
    bookSnapshot: book ? { title: book.title, isbn: book.isbn } : null,
    subject: opts.subject,
    description: opts.description,
    ...opts.extra,
  });
  return t._id.toString();
}

function fakeProvider(json: object) {
  const requests: LLMRequest[] = [];
  const p: LLMProvider = {
    name: "fake",
    isConfigured: () => true,
    modelFor: () => "fake-small",
    async generate(req) {
      requests.push(req);
      return { text: JSON.stringify(json), inputTokens: 900, outputTokens: 40, model: "fake-small" };
    },
  };
  return { p, requests };
}

describe("classifyTicket (integration)", () => {
  beforeAll(async () => {
    await startTestDb({ withDemoTickets: false });
  });
  afterAll(stopTestDb);
  afterEach(() => setLLMClientOverrides(null));

  it("with no API keys: applies RULE values, marks ai FAILED, ticket stays fully usable", async () => {
    const id = await makeTicket({
      bookCode: "BK005",
      subject: "No royalty received since publication",
      description: "My book was published in July 2024 and I have never received a single royalty payment.",
    });
    await expect(classifyTicket(id)).resolves.toBeUndefined();

    const t = await Ticket.findById(id).lean();
    expect(t).toMatchObject({
      category: "ROYALTY_PAYMENTS",
      categorySource: "RULE",
      priority: "CRITICAL",
      prioritySource: "RULE",
      priorityRank: 3,
    });
    expect(t!.ai!).toMatchObject({ status: "FAILED", model: "rule-engine-v1", attempts: 1, suggestedCategory: "ROYALTY_PAYMENTS" });
    expect(t!.ai!.error).toMatch(/^NOT_CONFIGURED/);
    expect(t!.ai!.lastAttemptAt).toBeInstanceOf(Date);

    const ev = await TicketEvent.findOne({ ticketId: id, type: "AI_CLASSIFIED" }).lean();
    expect(ev).toMatchObject({ actorName: "Rule engine", to: "ROYALTY_PAYMENTS / CRITICAL" });
    await flushUsageLogs();
    expect(await AiUsageLog.countDocuments({ ticketId: id })).toBe(0); // no call was made
  });

  it("with a provider: persists AI values, sends computed context, logs usage", async () => {
    const { p, requests } = fakeProvider({
      category: "DISTRIBUTION_AVAILABILITY",
      priority: "MEDIUM",
      confidence: 0.91,
      reasoning: "Listing shows unavailable; likely a stock sync issue.",
    });
    setLLMClientOverrides({ providers: [p] });
    const id = await makeTicket({
      bookCode: "BK006",
      subject: "Currently unavailable on Flipkart",
      description: "Debugging Life shows Currently Unavailable on Flipkart.",
    });
    await classifyTicket(id);

    const t = await Ticket.findById(id).lean();
    expect(t).toMatchObject({
      category: "DISTRIBUTION_AVAILABILITY",
      categorySource: "AI",
      priority: "MEDIUM",
      prioritySource: "AI",
      priorityRank: 1,
    });
    expect(t!.ai!).toMatchObject({ status: "DONE", confidence: 0.91, model: "fake-small", error: null });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ tier: "small", temperature: 0, responseFormat: "json", maxOutputTokens: 200 });
    expect(requests[0].user).toContain("<author_message>");
    expect(requests[0].user).toContain("Royalty pending ₹3,350");
    expect(requests[0].user).not.toContain("Vikram"); // no author PII in the classify prompt

    await flushUsageLogs();
    const logs = await AiUsageLog.find({ ticketId: id }).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ operation: "CLASSIFY", provider: "fake", success: true, inputTokens: 900, outputTokens: 40 });
    expect(await TicketEvent.countDocuments({ ticketId: id, type: "AI_CLASSIFIED", actorName: "AI" })).toBe(1);
  });

  it("invalid AI output twice → rule fallback, both attempts logged", async () => {
    const { p, requests } = fakeProvider({ category: "SOMETHING_ELSE", priority: "HIGH", confidence: 0.9, reasoning: "x" });
    setLLMClientOverrides({ providers: [p] });
    const id = await makeTicket({ subject: "ISBN wrong", description: "Different ISBN on Amazon than on my copy." });
    await classifyTicket(id);
    const t = await Ticket.findById(id).lean();
    expect(t).toMatchObject({ category: "ISBN_METADATA", categorySource: "RULE", priority: "HIGH" });
    expect(t!.ai!.error).toMatch(/^BAD_RESPONSE/);
    expect(requests).toHaveLength(2);
    await flushUsageLogs();
    expect(await AiUsageLog.countDocuments({ ticketId: id, success: false, errorCode: "BAD_RESPONSE" })).toBe(2);
  });

  it("never overwrites an ADMIN-sourced category", async () => {
    const id = await makeTicket({
      subject: "Royalty not received for 6 months",
      description: "I haven't received any royalty for 6 months.",
      extra: { category: "GENERAL_INQUIRY", categorySource: "ADMIN" },
    });
    await classifyTicket(id);
    const t = await Ticket.findById(id).lean();
    expect(t).toMatchObject({ category: "GENERAL_INQUIRY", categorySource: "ADMIN", prioritySource: "RULE" });
    expect(t!.ai!.suggestedCategory).toBe("ROYALTY_PAYMENTS"); // kept for override-rate metrics
  });

  it("skips tickets fully classified by an admin, and drops concurrent double-runs", async () => {
    const admin = await makeTicket({
      subject: "x",
      description: "y",
      extra: { category: "GENERAL_INQUIRY", categorySource: "ADMIN", priority: "LOW", prioritySource: "ADMIN" },
    });
    await classifyTicket(admin);
    expect((await Ticket.findById(admin).lean())!.ai!.attempts).toBe(0);

    const id = await makeTicket({ subject: "Print defect", description: "Blurry images in my author copies." });
    await Promise.all([classifyTicket(id), classifyTicket(id), classifyTicket(id)]);
    expect((await Ticket.findById(id).lean())!.ai!.attempts).toBe(1);
    expect(await TicketEvent.countDocuments({ ticketId: id, type: "AI_CLASSIFIED" })).toBe(1);
  });

  it("never throws for bad or unknown ids", async () => {
    await expect(classifyTicket("not-an-id")).resolves.toBeUndefined();
    await expect(classifyTicket("65f000000000000000000000")).resolves.toBeUndefined();
  });
});
