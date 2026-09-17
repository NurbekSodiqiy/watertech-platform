import { describe, expect, it, vi } from "vitest";
import { ContentValidationError, safeContent } from "@/lib/content/safe";
import { rowToScript, rowToCompetitor, type ScriptRow, type CompetitorRow } from "@/lib/content/db";

const scriptRow: ScriptRow = {
  id: "lead-orqali-tushgan",
  name: "Lead",
  cheat_sheet: "",
  stages: [{ id: "s1", label: "Salom", turns: [{ speaker: "operator", text: "Assalomu alaykum" }], objectionIds: [] }],
  stages_ru: null,
  name_ru: null,
  cheat_sheet_ru: null,
  status: "published",
  sort_order: 0,
  version: 1,
  updated_at: "2026-01-01T00:00:00Z",
  updated_by: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("safeContent", () => {
  it("returns the fallback and logs when fn throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await safeContent("scripts", () => Promise.reject(new Error("fetch failed")), []);
    expect(result).toEqual([]);
    expect(log).toHaveBeenCalledWith("[content:scripts]", "fetch failed");
    log.mockRestore();
  });

  it("rethrows dev content validation errors", async () => {
    await expect(
      safeContent("bundle", () => Promise.reject(new ContentValidationError("bad")), null)
    ).rejects.toBeInstanceOf(ContentValidationError);
  });
});

describe("row mappers", () => {
  it("parses valid stages JSONB", () => {
    expect(rowToScript(scriptRow).stages).toHaveLength(1);
  });

  it("falls back to [] on invalid stages instead of throwing", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const script = rowToScript({ ...scriptRow, stages: { not: "an array" }, stages_ru: [{ id: 1 }] });
    expect(script.stages).toEqual([]);
    expect(script.stagesRu).toEqual([]);
    expect(log).toHaveBeenCalledWith("[content] invalid stages for script", scriptRow.id);
    log.mockRestore();
  });

  it("narrows an unknown threat_level to the neutral value", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const row: CompetitorRow = {
      id: "x",
      name: "X",
      assortment: null,
      base_discount: null,
      volume_discount: null,
      retro_bonus: null,
      max_discount: null,
      payment_terms: null,
      payment_method: null,
      delivery_time: null,
      logistics: null,
      dealer_coverage: null,
      certificates: null,
      marketing_offers: null,
      threat_level: "Past",
      status: "published",
      sort_order: 0,
      version: 1,
      updated_at: "2026-01-01T00:00:00Z",
      updated_by: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(rowToCompetitor(row).threatLevel).toBe("Ma'lumot yo'q");
    log.mockRestore();
  });
});
