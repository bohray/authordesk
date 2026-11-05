import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Book, Ticket, User } from "@/server/db/models";
import { startTestDb, stopTestDb } from "../helpers/test-db";

describe("seed", () => {
  let result: Awaited<ReturnType<typeof startTestDb>>;
  beforeAll(async () => {
    result = await startTestDb();
  });
  afterAll(stopTestDb);

  it("loads the exact provided dataset", async () => {
    expect(result).toMatchObject({ authors: 10, books: 18, admins: 2 });
    expect(await User.countDocuments({ role: "AUTHOR" })).toBe(10);
    expect(await Book.countDocuments()).toBe(18);
  });

  it("keeps in-production books with null MRP / publication date", async () => {
    const bk = await Book.findOne({ code: "BK013" }).lean();
    expect(bk?.mrp).toBeNull();
    expect(bk?.publicationDate).toBeNull();
    expect(bk?.status).toMatch(/In Production/);
  });

  it("creates demo tickets with sequential numbers", async () => {
    const tickets = await Ticket.find().sort({ ticketNumber: 1 }).lean();
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].ticketNumber).toBe("T-1001");
  });
});
