import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDraftForTicket } from "@/server/ai";
import { setLLMClientOverrides } from "@/server/ai/llmClient";
import { LLMError, type LLMProvider, type LLMRequest } from "@/server/ai/providers/llmProvider";
import { flushUsageLogs } from "@/server/ai/usageLogger";
import { AiDraft, AiUsageLog, Book, Ticket, User } from "@/server/db/models";
import { startTestDb, stopTestDb } from "../helpers/test-db";

const fakeReplyText =
  "Hi Ananya,\n\nThank you for raising this, and I am truly sorry. Your royalty of ₹2,546 is overdue and that is on us. I have escalated it to our finance team today and we will update you within 48 hours.\n\nWarm regards,\nInkwell Publishing Author Support";

function fakeDraftProvider() {
  const requests: LLMRequest[] = [];
  const p: LLMProvider = {
    name: "fake",
    isConfigured: () => true,
    modelFor: () => "fake-large",
    async generate(req) {
      requests.push(req);
      return { text: fakeReplyText, inputTokens: 1800, outputTokens: 220, model: "fake-large" };
    },
  };
  return { p, requests };
}

let ticketId = "";
const usageCount = async () => {
  await flushUsageLogs();
  return AiUsageLog.countDocuments({ ticketId, operation: "DRAFT" });
};

describe("getDraftForTicket (integration)", () => {
  beforeAll(async () => {
    await startTestDb({ withDemoTickets: false });
    const book = await Book.findOne({ code: "BK005" }).lean();
    const t = await Ticket.create({
      ticketNumber: "T-8001",
      authorId: book!.authorId,
      bookId: book!._id,
      bookSnapshot: { title: book!.title, isbn: book!.isbn },
      subject: "No royalty since publication",
      description: "I have never received a royalty payment. Dashboard shows ₹2,546 pending.",
      category: "ROYALTY_PAYMENTS",
      categorySource: "AI",
    });
    ticketId = t._id.toString();
  });
  afterAll(stopTestDb);
  afterEach(() => setLLMClientOverrides(null));

  it("no keys → UNAVAILABLE with a 'not configured' message, never throws", async () => {
    const d = await getDraftForTicket(ticketId);
    expect(d).toMatchObject({ content: null, status: "UNAVAILABLE", cached: false });
    expect(d.message).toMatch(/not configured/i);
    expect(await getDraftForTicket("garbage")).toMatchObject({ status: "UNAVAILABLE" });
  });

  it("provider failure → UNAVAILABLE with the manual-reply message", async () => {
    const down: LLMProvider = {
      name: "down",
      isConfigured: () => true,
      modelFor: () => "m",
      generate: async () => {
        throw new LLMError("UNAVAILABLE", "503", { retryable: false });
      },
    };
    setLLMClientOverrides({ providers: [down] });
    const d = await getDraftForTicket(ticketId);
    expect(d).toMatchObject({ content: null, status: "UNAVAILABLE" });
    expect(d.message).toBe("AI drafting is temporarily unavailable. Please write a reply manually.");
  });

  it("generates, caches, invalidates on new message, and regenerates on demand", async () => {
    const { p, requests } = fakeDraftProvider();
    setLLMClientOverrides({ providers: [p] });
    const before = await usageCount();

    const first = await getDraftForTicket(ticketId);
    expect(first).toMatchObject({ status: "READY", cached: false, model: "fake-large", content: fakeReplyText });
    expect(await usageCount()).toBe(before + 1);

    // The prompt is grounded: computed facts + only the royalty KB section + delimiters.
    const req = requests[0];
    expect(req).toMatchObject({ tier: "large", responseFormat: "text", maxOutputTokens: 600 });
    expect(req.user).toContain("Last payout: NEVER");
    expect(req.user).toContain("Royalty assessment: OVERDUE");
    expect(req.user).toContain('greet as "Ananya"');
    expect(req.user).not.toContain("5–7 business days");
    expect(req.user).toContain("<author_message>");
    expect(req.system).toContain("Inkwell Publishing Author Support");

    const draft = await AiDraft.findOne({ ticketId }).lean();
    expect(draft).toMatchObject({ basedOnMessageCount: 0, promptVersion: "draft-v1", provider: "fake", inputTokens: 1800 });

    const second = await getDraftForTicket(ticketId);
    expect(second).toMatchObject({ status: "READY", cached: true, content: fakeReplyText });
    expect(await usageCount()).toBe(before + 1); // zero tokens spent

    const author = await User.findOne({ "authorProfile.code": "AUTH003" }).lean();
    await Ticket.updateOne(
      { _id: ticketId },
      { $push: { messages: { senderId: author!._id, senderRole: "AUTHOR", senderName: author!.name, body: "Any update?" } } },
    );
    const third = await getDraftForTicket(ticketId);
    expect(third.cached).toBe(false);
    expect(await usageCount()).toBe(before + 2);
    expect(requests[1].user).toContain("most recent follow-up");
    expect((await AiDraft.findOne({ ticketId }).lean())!.basedOnMessageCount).toBe(1);

    const forced = await getDraftForTicket(ticketId, { regenerate: true });
    expect(forced.cached).toBe(false);
    expect(await usageCount()).toBe(before + 3);
    expect(await AiDraft.countDocuments({ ticketId })).toBe(1); // upsert, not duplicate
  });
});
