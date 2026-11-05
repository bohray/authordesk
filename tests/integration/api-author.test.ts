import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The AI layer is owned elsewhere and must not affect these tests.
const ai = vi.hoisted(() => ({
  classifyTicket: vi.fn(async (...args: [string]) => void args),
  getDraftForTicket: vi.fn(),
}));
// Keep the real pure helpers (payout schedule) and replace only the LLM-backed calls.
vi.mock("@/server/ai", async (orig) => ({ ...(await orig<typeof import("@/server/ai")>()), ...ai }));

// `after()` needs a live Next request scope; run the callback on the next microtask instead.
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    void Promise.resolve().then(fn);
  },
}));

import { POST as loginPOST } from "@/app/api/v1/auth/login/route";
import { POST as logoutPOST } from "@/app/api/v1/auth/logout/route";
import { GET as meGET } from "@/app/api/v1/auth/me/route";
import { GET as booksGET } from "@/app/api/v1/me/books/route";
import { GET as myTicketGET } from "@/app/api/v1/me/tickets/[ticketId]/route";
import { POST as myMessagePOST } from "@/app/api/v1/me/tickets/[ticketId]/messages/route";
import { GET as myTicketsGET, POST as myTicketsPOST } from "@/app/api/v1/me/tickets/route";
import { GET as adminTicketsGET } from "@/app/api/v1/admin/tickets/route";
import { GET as updatesGET } from "@/app/api/v1/updates/route";
import { GET as openapiGET } from "@/app/api/v1/openapi.json/route";
import { Book, Ticket, User } from "@/server/db/models";
import { startTestDb, stopTestDb } from "../helpers/test-db";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(
  handler: Handler,
  opts: { method?: string; url: string; body?: unknown; cookie?: string; params?: Record<string, string> },
) {
  const req = new NextRequest(new URL(opts.url, "http://localhost"), {
    method: opts.method ?? "GET",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    headers: {
      "content-type": "application/json",
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null, headers: res.headers };
}

async function login(email: string, password: string) {
  const res = await call(loginPOST as Handler, {
    method: "POST",
    url: "/api/v1/auth/login",
    body: { email, password },
  });
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0];
}

const PRIYA = "priya.sharma@email.com";
const KAVITA = "kavita.deshmukh@email.com";
const flush = () => new Promise((r) => setTimeout(r, 10));

describe("auth + author API", () => {
  let priya: string;
  let kavita: string;

  beforeAll(async () => {
    await startTestDb();
    priya = await login(PRIYA, "Author@123");
    kavita = await login(KAVITA, "Author@123");
  });
  afterAll(stopTestDb);
  beforeEach(() => ai.classifyTicket.mockClear());

  describe("auth", () => {
    it("logs in, sets an httpOnly cookie and returns the session user", async () => {
      const res = await call(loginPOST as Handler, {
        method: "POST",
        url: "/api/v1/auth/login",
        body: { email: "ADMIN@authordesk.dev", password: "Admin@123" },
      });
      expect(res.status).toBe(200);
      expect(res.json.data).toMatchObject({ email: "admin@authordesk.dev", role: "ADMIN" });
      expect(res.json.data.passwordHash).toBeUndefined();
      expect(res.headers.get("set-cookie")).toMatch(/ad_session=.+HttpOnly/i);
    });

    it("rejects a wrong password and an unknown email with the same 401 message", async () => {
      const wrong = await call(loginPOST as Handler, {
        method: "POST",
        url: "/api/v1/auth/login",
        body: { email: "rohit.kapoor@email.com", password: "nope" },
      });
      const unknown = await call(loginPOST as Handler, {
        method: "POST",
        url: "/api/v1/auth/login",
        body: { email: "nobody@example.com", password: "nope" },
      });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.json.error).toEqual({ code: "UNAUTHENTICATED", message: "Invalid email or password" });
      expect(unknown.json.error.message).toBe(wrong.json.error.message);
    });

    it("validates the login body (422)", async () => {
      const res = await call(loginPOST as Handler, {
        method: "POST",
        url: "/api/v1/auth/login",
        body: { email: "not-an-email", password: "" },
      });
      expect(res.status).toBe(422);
      expect(res.json.error.code).toBe("VALIDATION_ERROR");
    });

    it("rate limits after 5 failures for the same email (429), even with the right password", async () => {
      const email = "arjun.malhotra@email.com";
      for (let i = 0; i < 5; i++) {
        const r = await call(loginPOST as Handler, {
          method: "POST",
          url: "/api/v1/auth/login",
          body: { email, password: "wrong" },
        });
        expect(r.status).toBe(401);
      }
      const blocked = await call(loginPOST as Handler, {
        method: "POST",
        url: "/api/v1/auth/login",
        body: { email, password: "Author@123" },
      });
      expect(blocked.status).toBe(429);
      expect(blocked.json.error.code).toBe("RATE_LIMITED");
    });

    it("returns the current user from /auth/me and 401 without a cookie", async () => {
      const me = await call(meGET as Handler, { url: "/api/v1/auth/me", cookie: priya });
      expect(me.json.data).toMatchObject({ email: PRIYA, role: "AUTHOR", authorCode: "AUTH001" });
      const anon = await call(meGET as Handler, { url: "/api/v1/auth/me" });
      expect(anon.status).toBe(401);
      expect(anon.json.error.code).toBe("UNAUTHENTICATED");
    });

    it("logout returns 204 and clears the cookie, even when signed out", async () => {
      const res = await call(logoutPOST as Handler, { method: "POST", url: "/api/v1/auth/logout" });
      expect(res.status).toBe(204);
      expect(res.headers.get("set-cookie")).toMatch(/ad_session=;/);
    });
  });

  describe("RBAC", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await call(myTicketsGET as Handler, { url: "/api/v1/me/tickets" });
      expect(res.status).toBe(401);
    });

    it("forbids an author from the admin queue (403)", async () => {
      const res = await call(adminTicketsGET as Handler, { url: "/api/v1/admin/tickets", cookie: priya });
      expect(res.status).toBe(403);
      expect(res.json.error.code).toBe("FORBIDDEN");
    });
  });

  describe("books", () => {
    it("returns my books, published first, with totals and the next payout date", async () => {
      const res = await call(booksGET as Handler, { url: "/api/v1/me/books", cookie: kavita });
      expect(res.status).toBe(200);
      const { books, totals, nextPayoutDate, payoutThreshold } = res.json.data;
      expect(books.map((b: { code: string }) => b.code)).toEqual(["BK016", "BK015"]);
      expect(books[0].isPublished).toBe(true);
      expect(books[1]).toMatchObject({ isPublished: false, publicationDate: null, mrp: null });
      expect(totals.copiesSold).toBe(books[0].copiesSold + books[1].copiesSold);
      expect(nextPayoutDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(payoutThreshold).toBe(1000);
    });

    it("sorts published books by publication date, newest first", async () => {
      const res = await call(booksGET as Handler, { url: "/api/v1/me/books", cookie: priya });
      expect(res.json.data.books.map((b: { code: string }) => b.code)).toEqual(["BK002", "BK001"]);
    });
  });

  describe("tickets", () => {
    let createdId: string;

    it("creates a ticket (201), returns a ticket number and schedules classification", async () => {
      const book = await Book.findOne({ code: "BK001" }).lean();
      const res = await call(myTicketsPOST as Handler, {
        method: "POST",
        url: "/api/v1/me/tickets",
        cookie: priya,
        body: {
          bookId: book!._id.toString(),
          subject: "Royalty statement missing",
          description: "I have not received my royalty statement for the last quarter at all.",
          attachment: { name: "statement.pdf", size: 1234, type: "application/pdf" },
        },
      });
      expect(res.status).toBe(201);
      const t = res.json.data;
      expect(t.ticketNumber).toMatch(/^T-\d+$/);
      expect(t.status).toBe("OPEN");
      expect(t.book).toEqual({ id: book!._id.toString(), title: book!.title, isbn: book!.isbn });
      expect(t.attachment).toEqual({ name: "statement.pdf", size: 1234 });
      createdId = t.id;

      await flush();
      expect(ai.classifyTicket).toHaveBeenCalledWith(createdId);
      const stored = await Ticket.findById(createdId).lean();
      expect(stored?.ai?.status).toBe("PENDING");
    });

    it("accepts GENERAL as an account-level ticket with no book", async () => {
      const res = await call(myTicketsPOST as Handler, {
        method: "POST",
        url: "/api/v1/me/tickets",
        cookie: priya,
        body: {
          bookId: "GENERAL",
          subject: "Update my bank details",
          description: "I changed banks and need to update where my royalties are sent.",
        },
      });
      expect(res.status).toBe(201);
      expect(res.json.data.book).toBeNull();
    });

    it("rejects an invalid body (422)", async () => {
      const res = await call(myTicketsPOST as Handler, {
        method: "POST",
        url: "/api/v1/me/tickets",
        cookie: priya,
        body: { bookId: "GENERAL", subject: "hi", description: "short" },
      });
      expect(res.status).toBe(422);
      const paths = res.json.error.details.map((d: { path: string }) => d.path);
      expect(paths).toEqual(expect.arrayContaining(["subject", "description"]));
    });

    it("rejects a bookId that belongs to another author (422 on bookId)", async () => {
      const otherBook = await Book.findOne({ code: "BK015" }).lean();
      const res = await call(myTicketsPOST as Handler, {
        method: "POST",
        url: "/api/v1/me/tickets",
        cookie: priya,
        body: {
          bookId: otherBook!._id.toString(),
          subject: "Not my book at all",
          description: "Trying to open a ticket against somebody else's book.",
        },
      });
      expect(res.status).toBe(422);
      expect(res.json.error.details[0]).toMatchObject({ path: "bookId" });
      expect(ai.classifyTicket).not.toHaveBeenCalled();
    });

    it("never exposes admin-only fields in the author DTO", async () => {
      // Simulate an admin-side state on the stored ticket.
      await Ticket.updateOne(
        { _id: createdId },
        { $set: { category: "ROYALTY_PAYMENTS", priority: "HIGH", "ai.status": "DONE" } },
      );
      const res = await call(myTicketGET as Handler, {
        url: `/api/v1/me/tickets/${createdId}`,
        cookie: priya,
        params: { ticketId: createdId },
      });
      expect(res.status).toBe(200);
      expect(Object.keys(res.json.data).sort()).toEqual(
        [
          "attachment",
          "book",
          "createdAt",
          "description",
          "id",
          "messages",
          "status",
          "subject",
          "ticketNumber",
          "updatedAt",
        ].sort(),
      );
    });

    it("returns 404 (not 403) for another author's ticket", async () => {
      const res = await call(myTicketGET as Handler, {
        url: `/api/v1/me/tickets/${createdId}`,
        cookie: kavita,
        params: { ticketId: createdId },
      });
      expect(res.status).toBe(404);
      expect(res.json.error.code).toBe("NOT_FOUND");
    });

    it("rejects a malformed ticket id (422)", async () => {
      const res = await call(myTicketGET as Handler, {
        url: "/api/v1/me/tickets/abc",
        cookie: priya,
        params: { ticketId: "abc" },
      });
      expect(res.status).toBe(422);
    });

    it("lists only my tickets, newest first, paginated", async () => {
      const res = await call(myTicketsGET as Handler, { url: "/api/v1/me/tickets?limit=2", cookie: priya });
      expect(res.status).toBe(200);
      expect(res.json.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
      const dates = res.json.data.map((t: { createdAt: string }) => Date.parse(t.createdAt));
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      const priyaId = (await User.findOne({ email: PRIYA }).lean())!._id;
      const owned = await Ticket.countDocuments({ authorId: priyaId });
      expect(owned).toBe(3);
    });

    it("adds a follow-up and reopens a RESOLVED ticket", async () => {
      const resolved = await Ticket.findOne({ subject: /author bio/ }).lean();
      const id = resolved!._id.toString();
      const res = await call(myMessagePOST as Handler, {
        method: "POST",
        url: `/api/v1/me/tickets/${id}/messages`,
        cookie: priya,
        params: { ticketId: id },
        body: { body: "Thanks, but it still shows the old bio.", aiAssisted: true },
      });
      expect(res.status).toBe(201);
      expect(res.json.data.status).toBe("OPEN");
      const last = res.json.data.messages.at(-1);
      expect(last).toMatchObject({ senderRole: "AUTHOR", aiAssisted: false });
      expect((await Ticket.findById(id).lean())!.resolvedAt).toBeNull();
    });

    it("refuses a follow-up on a CLOSED ticket (409)", async () => {
      await Ticket.updateOne({ _id: createdId }, { $set: { status: "CLOSED" } });
      const res = await call(myMessagePOST as Handler, {
        method: "POST",
        url: `/api/v1/me/tickets/${createdId}/messages`,
        cookie: priya,
        params: { ticketId: createdId },
        body: { body: "Hello?" },
      });
      expect(res.status).toBe(409);
      expect(res.json.error.message).toBe("This ticket is closed. Please open a new ticket.");
    });
  });

  describe("updates (polling)", () => {
    it("returns only my own changed tickets", async () => {
      const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
      const res = await call(updatesGET as Handler, {
        url: `/api/v1/updates?since=${encodeURIComponent(since)}`,
        cookie: kavita,
      });
      expect(res.status).toBe(200);
      const kavitaId = (await User.findOne({ email: KAVITA }).lean())!._id;
      const own = await Ticket.find({ authorId: kavitaId }, { _id: 1 }).lean();
      expect(res.json.data.changed.map((c: { id: string }) => c.id).sort()).toEqual(
        own.map((t) => t._id.toString()).sort(),
      );
      expect(Object.keys(res.json.data.changed[0]).sort()).toEqual(["id", "updatedAt"]);
      expect(Date.parse(res.json.data.serverTime)).not.toBeNaN();
    });

    it("validates `since` (422)", async () => {
      const res = await call(updatesGET as Handler, { url: "/api/v1/updates?since=yesterday", cookie: priya });
      expect(res.status).toBe(422);
    });
  });

  describe("openapi", () => {
    it("serves an OpenAPI 3 document with cookie auth and every path", async () => {
      const res = await call(openapiGET as Handler, { url: "/api/v1/openapi.json" });
      expect(res.status).toBe(200);
      expect(res.json.openapi).toMatch(/^3\.0/);
      expect(res.json.components.securitySchemes.cookieAuth).toMatchObject({
        type: "apiKey",
        in: "cookie",
        name: "ad_session",
      });
      expect(Object.keys(res.json.paths)).toEqual(
        expect.arrayContaining([
          "/api/v1/auth/login",
          "/api/v1/me/tickets/{ticketId}/messages",
          "/api/v1/admin/tickets",
          "/api/v1/admin/tickets/{ticketId}/ai/retry",
          "/api/v1/admin/stats",
          "/api/v1/updates",
        ]),
      );
      expect(res.json.components.schemas.ErrorBody).toBeDefined();
    });
  });
});
