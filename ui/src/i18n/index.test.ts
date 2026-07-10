import { describe, expect, it } from "vitest";
import { resolveLocale } from ".";

describe("resolveLocale", () => {
  it("returns exact matches", () => {
    expect(resolveLocale("vi")).toBe("vi");
    expect(resolveLocale("pt-BR")).toBe("pt-BR");
  });

  it("falls back to the base locale", () => {
    expect(resolveLocale("vi-VN")).toBe("vi");
    expect(resolveLocale("fr-CA")).toBe("fr");
  });

  it("matches a regional variant from a base language", () => {
    expect(resolveLocale("zh")).toBe("zh-CN");
    expect(resolveLocale("pt")).toBe("pt-BR");
  });

  it("returns undefined for unsupported or empty input", () => {
    expect(resolveLocale("xx")).toBeUndefined();
    expect(resolveLocale("")).toBeUndefined();
    expect(resolveLocale(null)).toBeUndefined();
    expect(resolveLocale(undefined)).toBeUndefined();
  });
});
