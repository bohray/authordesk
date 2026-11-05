import { describe, expect, it } from "vitest";
import { bookLabel, formatBytes, generalBookLabel, plural } from "@/lib/format";
import { ApiError, isNotFoundError } from "@/lib/apiClient";

describe("format helpers", () => {
  it("formats bytes without a trailing .0", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
    expect(formatBytes(null)).toBe("0 B");
  });

  it("pluralises with Indian digit grouping", () => {
    expect(plural(1, "book")).toBe("1 book");
    expect(plural(3, "book")).toBe("3 books");
    expect(plural(12000, "message")).toBe("12,000 messages");
  });

  it("labels account-level tickets consistently", () => {
    expect(bookLabel(null)).toBe(generalBookLabel);
    expect(bookLabel({ title: "The Last River" })).toBe("The Last River");
  });
});

describe("isNotFoundError", () => {
  it("treats bad ids, missing and foreign tickets as not found, not retryable", () => {
    for (const status of [400, 404, 422]) {
      expect(isNotFoundError(new ApiError(status, "NOT_FOUND", "x"))).toBe(true);
    }
    expect(isNotFoundError(new ApiError(500, "INTERNAL_ERROR", "x"))).toBe(false);
    expect(isNotFoundError(new Error("boom"))).toBe(false);
  });
});
