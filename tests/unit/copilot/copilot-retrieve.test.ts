import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CONTEXT_CHARS } from "@/lib/copilot/docs";
import type { CopilotChunk } from "@/lib/copilot/docs";
import { getContentBundle, getProducts } from "@/lib/content/loader";
import { retrieve } from "@/lib/copilot/retrieve";
import { products, publishedContentBundle } from "../../fixtures/content";

// retrieve() is the server entry point: unstable_cache around the cached
// loaders. Both are replaced here — the cache by a pass-through (so every call
// re-reads the mocked loaders), the loaders by the published fixture bundle —
// so the real doc building, ranking and context budget run end to end.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/content/loader", () => ({ getContentBundle: vi.fn(), getProducts: vi.fn() }));

const RETRIEVAL_TYPES = new Set(["package", "objection"]);

function totalChars(hits: CopilotChunk[]): number {
  return hits.reduce((sum, hit) => sum + hit.text.length, 0);
}

beforeEach(() => {
  vi.mocked(getContentBundle).mockResolvedValue(publishedContentBundle());
  vi.mocked(getProducts).mockResolvedValue(products);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("retrieve", () => {
  it('ranks package and objection hits first for "chegirma"', async () => {
    const hits = await retrieve("chegirma", "uz");

    expect(hits.length).toBeGreaterThan(0);
    expect(RETRIEVAL_TYPES.has(hits[0]?.type ?? "")).toBe(true);

    const types = hits.map((hit) => hit.type);
    const lastRelevant = Math.max(...types.map((type, i) => (RETRIEVAL_TYPES.has(type) ? i : -1)));
    const firstOther = types.findIndex((type) => !RETRIEVAL_TYPES.has(type));
    if (firstOther !== -1) expect(firstOther).toBeGreaterThan(lastRelevant);

    expect(types).toContain("package");
    expect(types).toContain("objection");
    expect(hits.map((hit) => hit.id)).toEqual(expect.arrayContaining(["objection:obj-chegirma", "package:pkg-diler"]));
  });

  // KNOWN ISSUE — flip to it() once fixed. Body-field hits score identically,
  // and createCopilotIndex breaks ties by doc order, where buildSearchDocs puts
  // competitors before packages. So a battle-card that merely mentions
  // "chegirma" outranks our own discount packages.
  it.fails("ranks our packages above a battle-card that also mentions chegirma", async () => {
    const bundle = publishedContentBundle();
    vi.mocked(getContentBundle).mockResolvedValue({
      ...bundle,
      competitors: bundle.competitors.map((c) => ({ ...c, marketingOffers: "Katta hajmga qo'shimcha chegirma" })),
    });

    const types = (await retrieve("chegirma", "uz")).map((hit) => hit.type);
    expect(types.indexOf("competitor")).toBeGreaterThan(types.lastIndexOf("package"));
  });

  it("loads content for the requested locale", async () => {
    await retrieve("chegirma", "ru");
    expect(getContentBundle).toHaveBeenCalledWith("ru");
    expect(getProducts).toHaveBeenCalledWith("ru");
  });

  it("returns [] for a term that isn't in the knowledge base", async () => {
    expect(await retrieve("zzqxwv", "uz")).toEqual([]);
  });

  it("returns [] for a question made only of filler words", async () => {
    expect(await retrieve("nima qanday qancha?", "uz")).toEqual([]);
  });

  it("returns [] instead of throwing when content can't be loaded", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(getContentBundle).mockResolvedValue({ scripts: [], objections: [], faqs: [], competitors: [], packageGroups: [] });
    vi.mocked(getProducts).mockResolvedValue([]);

    expect(await retrieve("chegirma", "uz")).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith("[copilot] retrieval docs unavailable:", expect.any(Error));
  });

  it(`keeps the total context within ${MAX_CONTEXT_CHARS} chars`, async () => {
    const bundle = publishedContentBundle();
    vi.mocked(getContentBundle).mockResolvedValue({
      ...bundle,
      faqs: Array.from({ length: 10 }, (_, i) => ({
        id: `faq-chegirma-${i}`,
        category: "Narxlar",
        question: `Chegirma savoli ${i}`,
        answer: "chegirma shartlari ".repeat(150),
      })),
    });

    const hits = await retrieve("chegirma", "uz", 10);
    expect(hits.length).toBeGreaterThan(1);
    expect(totalChars(hits)).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
    expect(totalChars(await retrieve("chegirma", "uz"))).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
  });

  it("gives every hit an in-app href starting with /", async () => {
    const questions = ["chegirma", "kafolat muddati", "yetkazib berish", "Труба ППР", "narx qimmat", "salomlashish"];
    const hits = (await Promise.all(questions.map((q) => retrieve(q, "uz")))).flat();

    expect(hits.length).toBeGreaterThan(questions.length);
    for (const hit of hits) {
      expect(hit.href.startsWith("/")).toBe(true);
      expect(hit.href.startsWith("//")).toBe(false);
    }
  });
});
