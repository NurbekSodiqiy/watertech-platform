import { afterEach, describe, expect, it, vi } from "vitest";
import { rowToSop, sopToRow, type SopRow } from "@/lib/content/db";
import { sopSchema, sopStepsSchema } from "@/lib/content/schemas";
import { sopWriteSchema } from "@/lib/admin/schemas";
import { sops } from "@/lib/content/sops";
import { runChecks } from "@/lib/agents/publish-gate/checks";
import { buildSearchDocs, createSearcher, resolveSearchPath } from "@/lib/search/index";
import { gateContext, contentBundle } from "../../fixtures/content";
import type { Sop } from "@/lib/content/types";

const sop: Sop = {
  id: "lead-creation",
  title: "Lid yaratish",
  summary: "Qisqa standart tartib-qoida",
  steps: [
    { title: "Lidni «Yangi lidlar» ustunida yarating", body: "Faqat mijoz telefon raqami bilan." },
    { title: "Manbani belgilang", body: "" },
  ],
  titleRu: "Создание лида",
  summaryRu: "Краткая стандартная процедура",
  stepsRu: [{ title: "Создайте лид в колонке «Новые лиды»", body: "Только с номером телефона клиента." }],
};

function fullRow(patch: Partial<SopRow> = {}): SopRow {
  return {
    ...sopToRow(sop),
    status: "published",
    sort_order: 0,
    version: 1,
    updated_at: "2026-09-20T08:00:00Z",
    updated_by: "manager@test",
    created_at: "2026-09-20T08:00:00Z",
    ...patch,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("sop row mapping", () => {
  it("rowToSop round-trips sopToRow", () => {
    expect(rowToSop(fullRow())).toEqual(sop);
  });

  it("saves blank Russian twins as null and reads them back as absent", () => {
    const row = sopToRow({ ...sop, titleRu: "", summaryRu: undefined, stepsRu: [] });
    expect(row.title_ru).toBeNull();
    expect(row.summary_ru).toBeNull();
    expect(row.steps_ru).toBeNull();
    const back = rowToSop(fullRow(row));
    expect(back.titleRu).toBeUndefined();
    expect(back.summaryRu).toBeUndefined();
    expect(back.stepsRu).toBeUndefined();
  });

  it("falls back to no steps, without throwing, when the steps JSONB is malformed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const back = rowToSop(fullRow({ steps: [{ step: 1, action: "x" }], steps_ru: "not an array" }));
    expect(back.steps).toEqual([]);
    expect(back.stepsRu).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("sop schemas", () => {
  it("accepts every seed SOP, each with a slug id and at least one step", () => {
    for (const seed of sops) {
      expect(() => sopSchema.parse(seed), seed.id).not.toThrow();
      expect(seed.id, seed.id).toMatch(/^[a-z0-9-]+$/);
      expect(seed.steps.length, seed.id).toBeGreaterThan(0);
    }
    expect(new Set(sops.map((s) => s.id)).size).toBe(sops.length);
  });

  it("keeps the six amoCRM pages the nav tree links to", () => {
    expect(sops.map((s) => s.id)).toEqual([
      "lead-creation",
      "stage-transition",
      "task-setting",
      "card-standard",
      "loss-reasons",
      "reports",
    ]);
  });

  it("validates steps as an array of { title, body }", () => {
    expect(sopStepsSchema.safeParse([{ title: "a", body: "" }]).success).toBe(true);
    expect(sopStepsSchema.safeParse([{ title: "a" }]).success).toBe(false);
    expect(sopStepsSchema.safeParse([{ step: 1, action: "a", note: "b" }]).success).toBe(false);
    expect(sopStepsSchema.safeParse({ title: "a", body: "b" }).success).toBe(false);
  });
});

describe("admin write schema", () => {
  const base = { ...sop, status: "draft" as const };

  it("accepts a valid write", () => {
    expect(() => sopWriteSchema.parse(base)).not.toThrow();
  });

  it("rejects a bad id and a bad status", () => {
    expect(sopWriteSchema.safeParse({ ...base, id: "Bad Id" }).success).toBe(false);
    expect(sopWriteSchema.safeParse({ ...base, status: "archived" }).success).toBe(false);
  });

  it("rejects no steps at all and a step without an instruction", () => {
    expect(sopWriteSchema.safeParse({ ...base, steps: [] }).success).toBe(false);
    expect(sopWriteSchema.safeParse({ ...base, steps: [{ title: "  ", body: "x" }] }).success).toBe(false);
    expect(sopWriteSchema.safeParse({ ...base, stepsRu: [{ title: "", body: "" }] }).success).toBe(false);
  });
});

describe("publish gate", () => {
  const target = { table: "content_sops" as const, row: sopToRow(sop) };

  it("passes a complete SOP with no issues", () => {
    expect(runChecks(target, gateContext())).toEqual({ passed: true, issues: [] });
  });

  it("blocks a SOP with a blank title or no steps", () => {
    const blank = runChecks({ table: "content_sops", row: { ...target.row, title: " ", steps: [] } }, gateContext());
    expect(blank.passed).toBe(false);
    expect(blank.issues.map((i) => `${i.code}:${i.field}`)).toEqual(
      expect.arrayContaining(["required_blank:title", "steps_none:steps"])
    );
  });

  it("reports malformed steps once, as a schema problem", () => {
    const result = runChecks({ table: "content_sops", row: { ...target.row, steps: [{ step: 1 }] } }, gateContext());
    expect(result.passed).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("schema_invalid");
    expect(result.issues.map((i) => i.code)).not.toContain("steps_none");
  });

  it("scans step text for placeholders and broken internal links", () => {
    const result = runChecks(
      {
        table: "content_sops",
        row: { ...target.row, steps: [{ title: "TODO: yozish", body: "Qarang: /faqs" }] },
      },
      gateContext()
    );
    expect(result.issues.map((i) => `${i.code}:${i.field}`)).toEqual(
      expect.arrayContaining(["placeholder_text:steps[0].title", "internal_link_broken:steps[0].body"])
    );
  });

  it("warns, without blocking, when the Russian twins are blank", () => {
    const result = runChecks(
      { table: "content_sops", row: { ...target.row, title_ru: null, summary_ru: "", steps_ru: [] } },
      gateContext()
    );
    expect(result.passed).toBe(true);
    expect(result.issues.map((i) => i.field)).toEqual(["title_ru", "summary_ru", "steps_ru"]);
  });
});

describe("SOPs in the search index", () => {
  const docs = buildSearchDocs(contentBundle, sops);

  it("adds one doc per SOP and leaves the bundle-only index unchanged", () => {
    expect(docs.filter((d) => d.type === "sop").map((d) => d.id)).toEqual(sops.map((s) => `sop:${s.id}`));
    expect(buildSearchDocs(contentBundle).some((d) => d.type === "sop")).toBe(false);
  });

  it("opens the SOP's own page", () => {
    const doc = docs.find((d) => d.id === "sop:lead-creation");
    expect(doc && resolveSearchPath(doc.nav)).toBe("/tools/amocrm/lead-creation");
  });

  it("finds a SOP by its title and by the text of a step", () => {
    const searcher = createSearcher(buildSearchDocs(contentBundle, [sop]));
    expect(searcher.searchAll("lid yaratish")[0]?.id).toBe("sop:lead-creation");
    expect(searcher.searchAll("Yangi lidlar ustunida")[0]?.id).toBe("sop:lead-creation");
  });
});
