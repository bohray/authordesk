import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const ai = vi.hoisted(() => ({
  classifyTicket: vi.fn(async (...args: [string]) => void args),
  getDraftForTicket: vi.fn(async (...args: [string, { regenerate?: boolean }?]) => ({
    content: "Hi, thanks for writing in.",
    status: "READY" as const,
    model: "test-model",
    generatedAt: new Date().toISOString(),
    cached: !args[1]?.regenerate,
  })),
}));
// Keep the real pure helpers (payout schedule) and replace only the LLM-backed calls.
vi.mock("@/server/ai", async (orig) => ({ ...(await orig<typeof import("@/server/ai")>()), ...ai }));

const afterSpy = vi.hoisted(() => vi.fn());
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    afterSpy();
    void Promise.resolve().then(fn);
  },
}));

import { POST as loginPOST } from "@/app/api/v1/auth/login/route";
import { GET as statsGET } from "@/app/api/v1/admin/stats/route";
import { POST as retryPOST } from "@/app/api/v1/admin/tickets/[ticketId]/ai/retry/route";
import { GET as draftGET } from "@/app/api/v1/admin/tickets/[ticketId]/draft/route";
import { POST as regeneratePOST } from "@/app/api/v1/admin/tickets/[ticketId]/draft/regenerate/route";
import { POST as replyPOST } from "@/app/api/v1/admin/tickets/[ticketId]/messages/route";
import { POST as notePOST } from "@/app/api/v1/admin/tickets/[ticketId]/notes/route";
import { GET as detailGET, PATCH as detailPATCH } from "@/app/api/v1/admin/tickets/[ticketId]/route";
import { GET as queueGET } from "@/app/api/v1/admin/tickets/route";
import { GET as myTicketGET } from "@/app/api/v1/me/tickets/[ticketId]/route";
import { POST as myTicketsPOST } from "@/app/api/v1/me/tickets/route";
import { GET as updatesGET } from "@/app/api/v1/updates/route";
import { AiUsageLog, Ticket, TicketEvent, User } from "@/server/db/models";
import { startTestDb, stopTestDb } from "../helpers/test-db";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(
  handler: Handler,
  opts: { method?: string; url: string; body?: unknown; cookie?: string; params?: Record<string, string> },
) {
  const req = new NextRequest(new URL(opts.url, "http://localhost"), {
    method: opts.method ?? "GET",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    headers: { "content-type": "application/json", ...(opts.cookie ? { cookie: opts.cookie } : {}) },
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

async function login(email: string, password: string) {
  const req = new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
  });
  const res = await loginPOST(req, { params: Promise.resolve({}) });
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0];
}

const flush = () => new Promise((r) => setTimeout(r, 10));

describe("admin API", () => {
  let admin: string;
  let ops: string;
  let author: string;
  let adminId: string;
  let ticketId: string; // fresh ticket created by an author

  beforeAll(async () => {
    await startTestDb();
    [admin, ops, author] = await Promise.all([
      login("admin@authordesk.dev", "Admin@123"),
      login("ops@authordesk.dev", "Admin@123"),
      login("diya.chatterjee@email.com", "Author@123"),
    ]);
    adminId = (await User.findOne({ email: "admin@authordesk.dev" }).lean())!._id.toString();
    const created = await call(myTicketsPOST as Handler, {
      method: "POST",
      url: "/api/v1/me/tickets",
      cookie: author,
      body: {
        bookId: "GENERAL",
        subject: "Small question about my profile",
        description: "Can I change the photo that appears on my author page please?",
      },
    });
    ticketId = created.json.data.id;
  });
  afterAll(stopTestDb);
  beforeEach(() => {
    ai.classifyTicket.mockClear();
    afterSpy.mockClear();
  });

  const params = () => ({ ticketId });

  describe("queue", () => {
    it("sorts by urgency: unresolved first, then priority desc, then oldest first", async () => {
      // Make the fresh ticket LOW so it must sort after the older CRITICAL one.
      await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: { priority: "LOW" },
      });
      const res = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?limit=100", cookie: admin });
      expect(res.status).toBe(200);
      const rows: { id: string; priority: string; status: string; createdAt: string }[] = res.json.data;
      expect(rows[0].priority).toBe("CRITICAL");

      const lowIdx = rows.findIndex((r) => r.id === ticketId);
      const criticalIdx = rows.findIndex((r) => r.priority === "CRITICAL");
      expect(criticalIdx).toBeLessThan(lowIdx);

      // Every resolved/closed ticket comes after every live one.
      const firstDone = rows.findIndex((r) => r.status === "RESOLVED" || r.status === "CLOSED");
      expect(firstDone).toBeGreaterThan(-1);
      expect(rows.slice(firstDone).every((r) => ["RESOLVED", "CLOSED"].includes(r.status))).toBe(true);

      // Within the same priority among live tickets, oldest first.
      const highs = rows.filter((r) => r.priority === "HIGH" && r.status !== "RESOLVED");
      const times = highs.map((r) => Date.parse(r.createdAt));
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it("returns list rows with author, assignee, messageCount and lastMessageAt", async () => {
      const res = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?status=RESOLVED", cookie: admin });
      expect(res.json.data).toHaveLength(1);
      const row = res.json.data[0];
      expect(row.author).toMatchObject({ name: "Priya Sharma", email: "priya.sharma@email.com" });
      expect(row.assignee).toMatchObject({ id: adminId, name: "Aisha Verma" });
      expect(row.messageCount).toBe(1);
      expect(row.lastMessageAt).not.toBeNull();
      expect(row.description).toBeUndefined();
      expect(row.messages).toBeUndefined();
    });

    it("filters by multiple priorities, assignee, text search and date range", async () => {
      const prio = await call(queueGET as Handler, {
        url: "/api/v1/admin/tickets?priority=CRITICAL,HIGH",
        cookie: admin,
      });
      expect(prio.json.data.length).toBeGreaterThan(0);
      expect(prio.json.data.every((r: { priority: string }) => ["CRITICAL", "HIGH"].includes(r.priority))).toBe(true);

      const unassigned = await call(queueGET as Handler, {
        url: "/api/v1/admin/tickets?assignee=unassigned",
        cookie: admin,
      });
      expect(unassigned.json.data.every((r: { assignee: unknown }) => r.assignee === null)).toBe(true);

      const mine = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?assignee=me", cookie: admin });
      expect(mine.json.data.length).toBeGreaterThan(0);
      expect(mine.json.data.every((r: { assignee: { id: string } }) => r.assignee?.id === adminId)).toBe(true);

      // Regex metacharacters are escaped, and search is case-insensitive.
      const q = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?q=isbn", cookie: admin });
      expect(q.json.data.map((r: { subject: string }) => r.subject)).toEqual(["Different ISBN showing on Amazon"]);
      const weird = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?q=(.*", cookie: admin });
      expect(weird.status).toBe(200);
      expect(weird.json.data).toHaveLength(0);

      const today = new Date().toISOString().slice(0, 10);
      const range = await call(queueGET as Handler, {
        url: `/api/v1/admin/tickets?from=${today}&to=${today}`,
        cookie: admin,
      });
      expect(range.json.data.map((r: { id: string }) => r.id)).toContain(ticketId);
      expect(range.json.data.every((r: { createdAt: string }) => r.createdAt.startsWith(today))).toBe(true);
    });

    it("keeps urgency order when the status filter is one-sided (index-friendly sort path)", async () => {
      const byUrgency = (rows: { priority: string | null; createdAt: string }[]) => {
        const rank = (p: string | null) => (p ? { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 }[p]! : -1);
        for (let i = 1; i < rows.length; i++) {
          const [a, b] = [rows[i - 1], rows[i]];
          expect(rank(a.priority)).toBeGreaterThanOrEqual(rank(b.priority));
          if (rank(a.priority) === rank(b.priority)) {
            expect(Date.parse(a.createdAt)).toBeLessThanOrEqual(Date.parse(b.createdAt));
          }
        }
      };
      const live = await call(queueGET as Handler, {
        url: "/api/v1/admin/tickets?status=OPEN,IN_PROGRESS&limit=100",
        cookie: admin,
      });
      expect(live.status).toBe(200);
      expect(live.json.data.length).toBeGreaterThan(1);
      byUrgency(live.json.data);

      // Mixed filter still puts every live ticket before every done one.
      const mixed = await call(queueGET as Handler, {
        url: "/api/v1/admin/tickets?status=RESOLVED,OPEN&limit=100",
        cookie: admin,
      });
      const statuses: string[] = mixed.json.data.map((r: { status: string }) => r.status);
      expect(statuses.indexOf("RESOLVED")).toBeGreaterThan(statuses.lastIndexOf("OPEN"));
      expect(mixed.json.data.some((r: { _resolved?: unknown }) => "_resolved" in r)).toBe(false);
    });

    it("paginates with meta", async () => {
      const res = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?limit=3&page=2", cookie: admin });
      expect(res.json.meta).toMatchObject({ page: 2, limit: 3, total: 9, totalPages: 3 });
      expect(res.json.data).toHaveLength(3);
    });

    it("rejects invalid filters (422)", async () => {
      const res = await call(queueGET as Handler, { url: "/api/v1/admin/tickets?status=NOPE", cookie: admin });
      expect(res.status).toBe(422);
    });
  });

  describe("detail + update", () => {
    it("returns the full detail with author profile and timeline", async () => {
      const res = await call(detailGET as Handler, {
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
      });
      expect(res.status).toBe(200);
      const d = res.json.data;
      expect(d.authorProfile).toMatchObject({ code: "AUTH010" });
      expect(d.bookDetails).toBeNull();
      expect(d.events[0]).toMatchObject({ type: "CREATED", to: "OPEN" });
      expect(d.ai.status).toBe("PENDING");
      // Fresh PENDING ticket: no self-heal retry yet.
      expect(afterSpy).not.toHaveBeenCalled();
    });

    it("self-heals a stale PENDING classification in the background", async () => {
      await Ticket.updateOne(
        { _id: ticketId },
        { $set: { "ai.lastAttemptAt": new Date(Date.now() - 5 * 60 * 1000) } },
      );
      await call(detailGET as Handler, { url: `/api/v1/admin/tickets/${ticketId}`, cookie: admin, params: params() });
      await flush();
      expect(ai.classifyTicket).toHaveBeenCalledWith(ticketId);
    });

    it("404s for an unknown ticket", async () => {
      const missing = "0123456789abcdef01234567";
      const res = await call(detailGET as Handler, {
        url: `/api/v1/admin/tickets/${missing}`,
        cookie: admin,
        params: { ticketId: missing },
      });
      expect(res.status).toBe(404);
    });

    it("PATCH overrides set source ADMIN, update rank and write one event per change", async () => {
      await TicketEvent.deleteMany({ ticketId, type: { $ne: "CREATED" } });
      const res = await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: { category: "GENERAL_INQUIRY", priority: "HIGH", assigneeId: "me", status: "RESOLVED" },
      });
      expect(res.status).toBe(200);
      const d = res.json.data;
      expect(d).toMatchObject({
        category: "GENERAL_INQUIRY",
        categorySource: "ADMIN",
        priority: "HIGH",
        prioritySource: "ADMIN",
        status: "RESOLVED",
        assignee: { id: adminId, name: "Aisha Verma" },
      });
      expect(d.resolvedAt).not.toBeNull();
      expect((await Ticket.findById(ticketId).lean())!.priorityRank).toBe(2);

      const types = d.events.map((e: { type: string }) => e.type);
      expect(types).toEqual(["CREATED", "STATUS_CHANGED", "CATEGORY_CHANGED", "PRIORITY_CHANGED", "ASSIGNED"]);
      const prio = d.events.find((e: { type: string }) => e.type === "PRIORITY_CHANGED");
      expect(prio).toMatchObject({ from: "LOW", to: "HIGH", actorName: "Aisha Verma" });
    });

    it("does not create events for no-op values", async () => {
      const before = await TicketEvent.countDocuments({ ticketId });
      const res = await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: { category: "GENERAL_INQUIRY", priority: "HIGH", status: "RESOLVED", assigneeId: adminId },
      });
      expect(res.status).toBe(200);
      expect(await TicketEvent.countDocuments({ ticketId })).toBe(before);
    });

    it("take-over records both names and the detail resolves author + assignee together", async () => {
      const assign = (cookie: string) =>
        call(detailPATCH as Handler, {
          method: "PATCH",
          url: `/api/v1/admin/tickets/${ticketId}`,
          cookie,
          params: params(),
          body: { assigneeId: "me" },
        });
      await assign(admin);
      const taken = await assign(ops);
      expect(taken.status).toBe(200);
      const d = taken.json.data;
      expect(d.assignee.name).not.toBe("Aisha Verma");
      expect(d.assignee.name).not.toBe("Unknown admin");
      expect(d.author).toMatchObject({ name: expect.any(String), email: "diya.chatterjee@email.com" });
      expect(d.authorProfile).toMatchObject({ code: "AUTH010" });
      const last = d.events.at(-1);
      expect(last).toMatchObject({ type: "ASSIGNED", from: "Aisha Verma", to: d.assignee.name });
    });

    it("reopening clears resolvedAt; assigning to a non-admin is 422; null unassigns", async () => {
      const reopened = await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: { status: "OPEN", assigneeId: null },
      });
      expect(reopened.json.data).toMatchObject({ status: "OPEN", resolvedAt: null, assignee: null });

      const authorUser = await User.findOne({ role: "AUTHOR" }).lean();
      const bad = await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: { assigneeId: authorUser!._id.toString() },
      });
      expect(bad.status).toBe(422);
      expect(bad.json.error.details[0].path).toBe("assigneeId");

      const empty = await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: {},
      });
      expect(empty.status).toBe(422);
    });
  });

  describe("replies + notes", () => {
    it("admin reply shows to the author, sets firstResponseAt, OPEN→IN_PROGRESS and assigns the replier", async () => {
      const res = await call(replyPOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/messages`,
        cookie: ops,
        params: params(),
        body: { body: "Yes, just send us the new photo.", aiAssisted: true },
      });
      expect(res.status).toBe(201);
      const d = res.json.data;
      expect(d.status).toBe("IN_PROGRESS");
      expect(d.firstResponseAt).not.toBeNull();
      expect(d.assignee.name).toBe("Karan Mehta");
      expect(d.messages.at(-1)).toMatchObject({ senderRole: "ADMIN", aiAssisted: true });
      expect(d.events.map((e: { type: string }) => e.type)).toEqual(
        expect.arrayContaining(["STATUS_CHANGED", "ASSIGNED", "REPLIED"]),
      );

      const authorView = await call(myTicketGET as Handler, {
        url: `/api/v1/me/tickets/${ticketId}`,
        cookie: author,
        params: params(),
      });
      expect(authorView.json.data.status).toBe("IN_PROGRESS");
      expect(authorView.json.data.messages.at(-1)).toMatchObject({
        senderRole: "ADMIN",
        senderName: "Karan Mehta",
        body: "Yes, just send us the new photo.",
      });
    });

    it("keeps the first firstResponseAt on later replies", async () => {
      const first = (await Ticket.findById(ticketId).lean())!.firstResponseAt;
      await call(replyPOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/messages`,
        cookie: admin,
        params: params(),
        body: { body: "Following up." },
      });
      const t = (await Ticket.findById(ticketId).lean())!;
      expect(t.firstResponseAt?.getTime()).toBe(first?.getTime());
      expect(t.assigneeId?.toString()).not.toBe(adminId); // already owned by ops: not stolen
    });

    it("adds an internal note, bumps updatedAt, and never shows it to the author", async () => {
      const since = new Date().toISOString();
      await flush();
      const res = await call(notePOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/notes`,
        cookie: admin,
        params: params(),
        body: { body: "Author is a VIP, prioritise." },
      });
      expect(res.status).toBe(201);
      expect(res.json.data).toMatchObject({ adminName: "Aisha Verma", body: "Author is a VIP, prioritise." });

      const detail = await call(detailGET as Handler, {
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
      });
      expect(detail.json.data.notes).toHaveLength(1);
      expect(detail.json.data.events.at(-1).type).toBe("NOTE_ADDED");

      const authorView = await call(myTicketGET as Handler, {
        url: `/api/v1/me/tickets/${ticketId}`,
        cookie: author,
        params: params(),
      });
      expect(JSON.stringify(authorView.json)).not.toContain("VIP");
      expect(authorView.json.data.notes).toBeUndefined();

      const updates = await call(updatesGET as Handler, {
        url: `/api/v1/updates?since=${encodeURIComponent(since)}`,
        cookie: admin,
      });
      expect(updates.json.data.changed.map((c: { id: string }) => c.id)).toContain(ticketId);
    });

    it("refuses replies on a CLOSED ticket (409)", async () => {
      await call(detailPATCH as Handler, {
        method: "PATCH",
        url: `/api/v1/admin/tickets/${ticketId}`,
        cookie: admin,
        params: params(),
        body: { status: "CLOSED" },
      });
      const res = await call(replyPOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/messages`,
        cookie: admin,
        params: params(),
        body: { body: "One more thing" },
      });
      expect(res.status).toBe(409);
    });
  });

  describe("AI endpoints", () => {
    it("returns a draft and regenerates on demand", async () => {
      const draft = await call(draftGET as Handler, {
        url: `/api/v1/admin/tickets/${ticketId}/draft`,
        cookie: admin,
        params: params(),
      });
      expect(draft.status).toBe(200);
      expect(draft.json.data).toMatchObject({ status: "READY", cached: true });
      expect(ai.getDraftForTicket).toHaveBeenLastCalledWith(ticketId, { regenerate: false });

      const regen = await call(regeneratePOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/draft/regenerate`,
        cookie: admin,
        params: params(),
      });
      expect(regen.json.data.cached).toBe(false);
      expect(ai.getDraftForTicket).toHaveBeenLastCalledWith(ticketId, { regenerate: true });
    });

    it("404s a draft for an unknown ticket without calling the AI", async () => {
      ai.getDraftForTicket.mockClear();
      const missing = "0123456789abcdef01234567";
      const res = await call(draftGET as Handler, {
        url: `/api/v1/admin/tickets/${missing}/draft`,
        cookie: admin,
        params: { ticketId: missing },
      });
      expect(res.status).toBe(404);
      expect(ai.getDraftForTicket).not.toHaveBeenCalled();
    });

    it("retries classification synchronously and returns the detail", async () => {
      const res = await call(retryPOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/ai/retry`,
        cookie: admin,
        params: params(),
      });
      expect(res.status).toBe(200);
      expect(ai.classifyTicket).toHaveBeenCalledWith(ticketId);
      expect(res.json.data.id).toBe(ticketId);
    });

    it("404s a classification retry for an unknown ticket without calling the AI", async () => {
      const missing = "0123456789abcdef01234567";
      const res = await call(retryPOST as Handler, {
        method: "POST",
        url: `/api/v1/admin/tickets/${missing}/ai/retry`,
        cookie: admin,
        params: { ticketId: missing },
      });
      expect(res.status).toBe(404);
      expect(ai.classifyTicket).not.toHaveBeenCalled();
    });

    it("forbids authors from admin AI endpoints", async () => {
      const res = await call(draftGET as Handler, {
        url: `/api/v1/admin/tickets/${ticketId}/draft`,
        cookie: author,
        params: params(),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("stats", () => {
    it("aggregates queue and AI metrics", async () => {
      await AiUsageLog.insertMany([
        { operation: "CLASSIFY", provider: "gemini", model: "m", inputTokens: 100, outputTokens: 20, success: true },
        { operation: "DRAFT", provider: "gemini", model: "m", inputTokens: 50, outputTokens: 0, success: false },
      ]);
      // One seeded AI suggestion overridden by an admin, one fallback (RULE) classification.
      const [a, b] = await Ticket.find({ "ai.status": "DONE", status: "OPEN" }).sort({ createdAt: 1 }).limit(2);
      await Ticket.updateOne({ _id: a._id }, { $set: { category: "GENERAL_INQUIRY", categorySource: "ADMIN" } });
      await Ticket.updateOne({ _id: b._id }, { $set: { categorySource: "RULE" } });

      const res = await call(statsGET as Handler, { url: "/api/v1/admin/stats", cookie: admin });
      expect(res.status).toBe(200);
      const s = res.json.data;

      const unresolved = await Ticket.countDocuments({ status: { $in: ["OPEN", "IN_PROGRESS"] } });
      const openSum = Object.values(s.openByPriority as Record<string, number>).reduce((x, y) => x + y, 0);
      expect(openSum).toBe(unresolved);
      expect(Object.keys(s.openByPriority).sort()).toEqual(["CRITICAL", "HIGH", "LOW", "MEDIUM", "UNCLASSIFIED"]);
      expect(s.byStatus.CLOSED).toBe(1);
      expect(s.ai).toMatchObject({ calls: 2, failures: 1, inputTokens: 150, outputTokens: 20 });

      const nonPending = await Ticket.countDocuments({ "ai.status": { $ne: "PENDING" } });
      const suggested = await Ticket.countDocuments({ "ai.suggestedCategory": { $ne: null } });
      expect(s.ai.fallbackRate).toBeCloseTo(1 / nonPending, 3);
      expect(s.ai.overrideRate).toBeCloseTo(1 / suggested, 3);
      expect(s.oldestOpenAt).not.toBeNull();
    });
  });
});
