import { describe, expect, it } from "vitest";
import { getActiveFilters } from "@/features/admin-queue/utils/activeFilters";
import {
  describeDateRange,
  matchDateSelection,
  presetRange,
  toIsoDate,
} from "@/features/admin-queue/utils/dateRange";
import type { AdminQueueQuery } from "@/types/queue";

// Local-time date (not UTC) so the tests match what <input type="date"> produces.
const today = new Date(2026, 10, 6); // 6 Nov 2026

const baseQuery: AdminQueueQuery = {
  status: ["OPEN", "IN_PROGRESS"],
  category: null,
  priority: null,
  assignee: null,
  from: null,
  to: null,
  q: "",
  sort: "urgency",
  page: 1,
};

describe("date presets", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toIsoDate(today)).toBe("2026-11-06");
  });

  it("builds open-ended ranges that include today", () => {
    expect(presetRange("today", today)).toEqual({ from: "2026-11-06", to: null });
    expect(presetRange("last7", today)).toEqual({ from: "2026-10-31", to: null });
    expect(presetRange("last30", today)).toEqual({ from: "2026-10-08", to: null });
  });

  it("recognises a preset from its from/to, else treats it as custom", () => {
    expect(matchDateSelection(null, null, today)).toBe("any");
    expect(matchDateSelection("2026-10-31", null, today)).toBe("last7");
    expect(matchDateSelection("2026-10-31", "2026-11-02", today)).toBe("custom");
    expect(matchDateSelection(null, "2026-11-02", today)).toBe("custom");
  });

  it("labels the pill with the preset name or the custom range", () => {
    expect(describeDateRange("2026-11-06", null, today)).toBe("Today");
    expect(describeDateRange(null, "2026-11-02", today)).toMatch(/^Until /);
  });
});

describe("active filter pills", () => {
  it("shows nothing for the default view", () => {
    expect(getActiveFilters(baseQuery)).toEqual([]);
  });

  it("doesn't pill a status the switch already shows", () => {
    expect(getActiveFilters({ ...baseQuery, status: ["RESOLVED"] })).toEqual([]);
    expect(getActiveFilters({ ...baseQuery, status: [] })).toEqual([]);
  });

  it("pills a deep-linked status the switch can't show, and clears it to the default", () => {
    const [pill] = getActiveFilters({ ...baseQuery, status: ["OPEN"] });
    expect(pill).toMatchObject({ key: "status", label: "Status: Open" });
    expect(pill.clear).toEqual({ status: ["OPEN", "IN_PROGRESS"] });
  });

  it("lists each narrowing filter with a patch that removes only it", () => {
    const pills = getActiveFilters({
      ...baseQuery,
      priority: "HIGH",
      category: "ISBN_METADATA",
      assignee: "unassigned",
      from: "2026-10-01",
    });
    expect(pills.map((p) => p.key)).toEqual(["priority", "category", "assignee", "date"]);
    expect(pills.find((p) => p.key === "priority")?.label).toBe("Priority: High");
    expect(pills.find((p) => p.key === "date")?.clear).toEqual({ from: null, to: null });
  });
});
