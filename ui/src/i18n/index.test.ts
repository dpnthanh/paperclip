import { describe, expect, it } from "vitest";
import { resolveLocale } from ".";

describe("resolveLocale", () => {
  it("returns exact matches", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("vi")).toBe("vi");
  });

  it("falls back to the base locale", () => {
    expect(resolveLocale("vi-VN")).toBe("vi");
    expect(resolveLocale("en-US")).toBe("en");
  });

  it("returns undefined for unsupported or empty input", () => {
    expect(resolveLocale("fr")).toBeUndefined();
    expect(resolveLocale("xx")).toBeUndefined();
    expect(resolveLocale("")).toBeUndefined();
    expect(resolveLocale(null)).toBeUndefined();
    expect(resolveLocale(undefined)).toBeUndefined();
  });
});
