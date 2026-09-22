import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CONTENT_REGISTRY, gateTargetFor, isContentTable } from "@/lib/admin/registry";
import { DASHBOARD_TABLE_KIND, adminEditHref, type DashboardTableName } from "@/lib/dashboard/content-health";

// content-health.ts reaches the service-role client and next/cache at import
// time; neither is used by the two pure exports this file reads.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => null,
  createDynamicAdminClient: () => null,
}));

const TABLES = Object.keys(DASHBOARD_TABLE_KIND) as DashboardTableName[];

/** Column names of one table's `Row` block in the generated (here:
 * hand-maintained) Supabase types. Read as text because the file is types
 * only — there is nothing to import at runtime, and keeping the registry in
 * step with that file is exactly what this test is for. */
const DATABASE_TYPES = readFileSync(
  path.resolve(__dirname, "../../../lib/supabase/database.types.ts"),
  "utf8"
);

function rowColumns(table: string): Set<string> {
  const block = new RegExp(`\\n      ${table}: \\{\\n        Row: \\{\\n([\\s\\S]*?)\\n        \\}`).exec(
    DATABASE_TYPES
  );
  if (!block?.[1]) throw new Error(`no Row block for ${table} in database.types.ts`);
  return new Set([...block[1].matchAll(/^ {10}([a-z0-9_]+)(\??):/gm)].map((match) => match[1] ?? ""));
}

describe("content registry completeness", () => {
  it("has an entry for every dashboard content table, keyed by its own table name", () => {
    expect(Object.keys(CONTENT_REGISTRY).sort()).toEqual([...TABLES].sort());
    for (const table of TABLES) {
      expect(CONTENT_REGISTRY[table].table).toBe(table);
    }
  });

  it("agrees with DASHBOARD_TABLE_KIND on every table's cache tag", () => {
    for (const table of TABLES) {
      expect(CONTENT_REGISTRY[table].kind).toBe(DASHBOARD_TABLE_KIND[table]);
    }
  });

  it("agrees with adminEditHref on every table's editor path", () => {
    for (const table of TABLES) {
      expect(`${CONTENT_REGISTRY[table].adminPath}/demo-id`).toBe(adminEditHref(table, "demo-id"));
    }
  });

  it("names only real columns in listColumns and titleColumn", () => {
    for (const table of TABLES) {
      const columns = rowColumns(table);
      const entry = CONTENT_REGISTRY[table];
      const unknown = [...entry.listColumns, entry.titleColumn].filter((column) => !columns.has(column));
      expect({ table, unknown }).toEqual({ table, unknown: [] });
      expect(entry.listColumns.length).toBeGreaterThan(0);
    }
  });

  it("orders lists by columns the table actually has", () => {
    for (const table of TABLES) {
      const columns = rowColumns(table);
      for (const order of CONTENT_REGISTRY[table].listOrder ?? []) {
        expect({ table, column: order.column, known: columns.has(order.column) }).toEqual({
          table,
          column: order.column,
          known: true,
        });
      }
    }
  });

  it("keeps the big JSONB trees out of list projections", () => {
    // The reason listColumns exists: a list renders a name, and shipping a
    // script's stage tree to the browser for it is pure RSC payload.
    expect(CONTENT_REGISTRY.content_scripts.listColumns).toEqual(["name"]);
    for (const table of TABLES) {
      expect(CONTENT_REGISTRY[table].listColumns).not.toContain("stages");
      expect(CONTENT_REGISTRY[table].listColumns).not.toContain("stages_ru");
    }
  });

  it("recognises exactly the registry's tables", () => {
    for (const table of TABLES) expect(isContentTable(table)).toBe(true);
    expect(isContentTable("content_versions")).toBe(false);
    expect(isContentTable("allowed_users")).toBe(false);
  });
});

describe("gateTargetFor", () => {
  it("tags a mapped row with the table it came from", () => {
    const row = CONTENT_REGISTRY.content_faqs.toRow({
      id: "faq-kafolat",
      category: "Kafolat",
      question: "Kafolat muddati qancha?",
      answer: "10 yil.",
      status: "draft",
    });

    expect(gateTargetFor("content_faqs", row)).toEqual({
      table: "content_faqs",
      row: {
        id: "faq-kafolat",
        category: "Kafolat",
        question: "Kafolat muddati qancha?",
        answer: "10 yil.",
        question_ru: null,
        answer_ru: null,
      },
    });
  });

  it("covers every table, so no gate call can hit a missing pairing", () => {
    for (const table of TABLES) {
      expect(gateTargetFor(table, { id: "x" })).toEqual({ table, row: { id: "x" } });
    }
  });
});
