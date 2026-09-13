import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/lib/search/normalize";

describe("normalizeSearchText", () => {
  it("transliterates Cyrillic to Latin", () => {
    expect(normalizeSearchText("нарх")).toBe("narx");
  });

  it("collapses every Uzbek apostrophe variant to the same string", () => {
    const variants = ["so'z", "so‘z", "soʻz"]; // ' (apostrophe), ‘ (left single quote), ʻ (modifier letter turned comma)
    const normalized = variants.map(normalizeSearchText);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("soz");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeSearchText("  Narxi   qimmat  ")).toBe("narxi qimmat");
  });
});
