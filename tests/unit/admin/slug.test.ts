import { describe, expect, it } from "vitest";
import { toSlug } from "@/lib/admin/slug";
import { idSchema } from "@/lib/admin/schemas";

describe("toSlug", () => {
  it("lowercases and kebab-cases plain Latin text", () => {
    expect(toSlug("Lead orqali tushgan")).toBe("lead-orqali-tushgan");
  });

  it("drops the Uzbek Latin apostrophe letters instead of splitting on them", () => {
    expect(toSlug("bo'lim")).toBe("bolim");
    expect(toSlug("to'lov")).toBe("tolov");
    expect(toSlug("g'oya")).toBe("goya");
    // Typographic and modifier-letter spellings of the same two letters.
    expect(toSlug("bo’lim")).toBe("bolim");
    expect(toSlug("gʻoya")).toBe("goya");
  });

  it("transliterates Russian Cyrillic to Latin", () => {
    expect(toSlug("Скидка")).toBe("skidka");
    expect(toSlug("Объект")).toBe("obekt");
    expect(toSlug("Щётка")).toBe("shchyotka");
  });

  it("collapses punctuation and whitespace runs into single hyphens", () => {
    expect(toSlug("  Qimmat — narx!!  ")).toBe("qimmat-narx");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(toSlug("-already-hyphenated-")).toBe("already-hyphenated");
  });

  it("returns an empty string for input that is only punctuation", () => {
    expect(toSlug("—!?")).toBe("");
  });

  it("always produces a slug idSchema accepts, or an empty string", () => {
    const samples = ["Lead orqali tushgan", "bo'lim", "Скидка г'оя", "Qimmat — narx!!", "12 oy"];
    for (const sample of samples) {
      const slug = toSlug(sample);
      if (slug !== "") expect(idSchema.safeParse(slug).success).toBe(true);
    }
  });
});
