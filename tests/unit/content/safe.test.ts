import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentUnavailableError, ContentValidationError, safeContent } from "@/lib/content/safe";
import { rowToScript, rowToCompetitor, type ScriptRow, type CompetitorRow } from "@/lib/content/db";

// lib/content/safe.ts reads CONTENT_BUILD_MODE through lib/env.ts, which parses
// `clientEnv` eagerly at module load. Hoisted so these land before the import
// above is evaluated; `??=` keeps a real .env.local value if one is present.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key-anon-key-anon-key";
});

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

// lib/env.ts reads CONTENT_BUILD_MODE per call, so stubbing the variable is
// enough — no module reset needed, unlike the cached secret getters.
afterEach(() => {
  vi.unstubAllEnvs();
});

function fail(message: string): () => Promise<never> {
  return () => Promise.reject(new Error(message));
}

describe("safeContent — degrade mode", () => {
  it("returns the fallback and logs when fn throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await safeContent("scripts", fail("fetch failed"), [], "degrade");
    expect(result).toEqual([]);
    expect(log).toHaveBeenCalledWith("[content:scripts]", "fetch failed");
    log.mockRestore();
  });

  it("returns the value untouched when fn succeeds", async () => {
    expect(await safeContent("faqs", () => Promise.resolve([1, 2]), [], "degrade")).toEqual([1, 2]);
  });

  it("degrades even when CONTENT_BUILD_MODE is unset", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("CONTENT_BUILD_MODE", "");
    await expect(safeContent("products", fail("fetch failed"), [], "degrade")).resolves.toEqual([]);
    log.mockRestore();
  });
});

describe("safeContent — page mode", () => {
  // CI exports CONTENT_BUILD_MODE=allow-empty for the whole job (ci.yml), which
  // would turn these into degrade tests — pin the production value here.
  beforeEach(() => {
    vi.stubEnv("CONTENT_BUILD_MODE", "strict");
  });

  it("rethrows as ContentUnavailableError naming the content kind", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = await safeContent("scripts", fail("fetch failed"), [], "page").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentUnavailableError);
    expect((error as ContentUnavailableError).kind).toBe("scripts");
    expect((error as Error).message).toContain('"scripts"');
    // The cause goes to the server log, never into the thrown message: a
    // PostgREST error or a `fetch failed` naming the project URL would end up
    // in build output and error overlays.
    expect((error as Error).message).not.toContain("fetch failed");
    expect(log).toHaveBeenCalledWith("[content:scripts]", "fetch failed");
    log.mockRestore();
  });

  it("still returns the value when fn succeeds", async () => {
    expect(await safeContent("faqs", () => Promise.resolve(["a"]), [], "page")).toEqual(["a"]);
  });

  it("rethrows a nested ContentUnavailableError unchanged, without logging twice", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const inner = new ContentUnavailableError("objections");
    const error = await safeContent("bundle", () => Promise.reject(inner), [], "page").catch((e: unknown) => e);

    expect(error).toBe(inner);
    expect((error as ContentUnavailableError).kind).toBe("objections");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("safeContent — CONTENT_BUILD_MODE=allow-empty", () => {
  it("degrades a page read instead of throwing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("CONTENT_BUILD_MODE", "allow-empty");
    await expect(safeContent("scripts", fail("fetch failed"), [], "page")).resolves.toEqual([]);
    log.mockRestore();
  });

  it("swallows a nested ContentUnavailableError too", async () => {
    vi.stubEnv("CONTENT_BUILD_MODE", "allow-empty");
    const inner = () => Promise.reject(new ContentUnavailableError("sops"));
    await expect(safeContent("bundle", inner, [], "page")).resolves.toEqual([]);
  });

  it("is fail-closed: an unrecognised value reads as strict", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("CONTENT_BUILD_MODE", "allow-emty");
    await expect(safeContent("faqs", fail("fetch failed"), [], "page")).rejects.toBeInstanceOf(ContentUnavailableError);
    log.mockRestore();
  });

  it("does not apply to an explicit strict value", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("CONTENT_BUILD_MODE", "strict");
    await expect(safeContent("faqs", fail("fetch failed"), [], "page")).rejects.toBeInstanceOf(ContentUnavailableError);
    log.mockRestore();
  });
});

describe("safeContent — ContentValidationError", () => {
  it("rethrows in degrade mode, whatever the build mode", async () => {
    vi.stubEnv("CONTENT_BUILD_MODE", "allow-empty");
    await expect(
      safeContent("bundle", () => Promise.reject(new ContentValidationError("bad")), null, "degrade")
    ).rejects.toBeInstanceOf(ContentValidationError);
  });

  it("rethrows in page mode under allow-empty", async () => {
    vi.stubEnv("CONTENT_BUILD_MODE", "allow-empty");
    await expect(
      safeContent("bundle", () => Promise.reject(new ContentValidationError("bad")), null, "page")
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
