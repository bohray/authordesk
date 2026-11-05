import { describe, expect, it } from "vitest";
import { nextPayoutDate } from "@/server/services/royaltySchedule";

const at = (d: string) => new Date(`${d}T10:00:00.000Z`);

describe("royalty schedule (quarter end + 45 days, shared with the AI layer)", () => {
  it.each([
    ["2026-11-05", "2026-11-14"], // Q3 (Sep 30) payout still ahead
    ["2026-11-20", "2027-02-14"], // past Q3 payout → Q4 (Dec 31) payout
    ["2026-11-14", "2026-11-14"], // on the payout day itself, that day is still the next payout
    ["2026-11-15", "2027-02-14"],
    ["2026-11-13", "2026-11-14"],
    ["2026-01-10", "2026-02-14"], // previous year's Q4
    ["2026-02-15", "2026-05-15"], // Q1 (Mar 31) + 45
    ["2026-05-16", "2026-08-14"], // Q2 (Jun 30) + 45
    ["2024-02-01", "2024-02-14"], // leap year: Dec 31 + 45 is still Feb 14
  ])("today %s → %s", (today, expected) => {
    expect(nextPayoutDate(at(today))).toBe(expected);
  });
});
