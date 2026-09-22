import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STALE_DAYS, getContentHealth } from "@/lib/dashboard/content-health";
import { runContentScan } from "@/lib/agents/stale-scan";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import type { DashboardTableName } from "@/lib/dashboard/content-health";

type Row = Record<string, unknown>;

// In-memory stand-in for the service-role client: `from(t).select()` returns a
// thenable builder supporting the eq/is/in filters these two modules use, and
// `insert` records what would have been written.
const db = vi.hoisted(() => {
  const tables = new Map<string, Row[]>();
  const inserts: { table: string; rows: Row[] }[] = [];

  function query(table: string) {
    let rows = [...(tables.get(table) ?? [])];
    const builder = {
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
        return builder;
      },
      is(column: string, value: null) {
        rows = rows.filter((row) => (row[column] ?? null) === value);
        return builder;
      },
      in(column: string, values: readonly unknown[]) {
        rows = rows.filter((row) => values.includes(row[column]));
        return builder;
      },
      // supabase-js's overrideTypes is a type-level cast that returns the
      // builder unchanged at runtime; the scan calls it on its dynamic reads.
      overrideTypes() {
        return builder;
      },
      then<T>(onFulfilled: (result: { data: Row[]; error: null }) => T) {
        return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
      },
    };
    return builder;
  }

  const client = {
    from: (table: string) => ({
      select: () => query(table),
      insert: async (payload: Row | Row[]) => {
        inserts.push({ table, rows: Array.isArray(payload) ? payload : [payload] });
        return { error: null };
      },
    }),
  };

  return { tables, inserts, client };
});

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidatePath: vi.fn() }));
// The scan reads content tables through the column-agnostic client (its table
// names come from CONTENT_REGISTRY at runtime) and writes notifications through
// the typed one. Both are the same fake here.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client,
  createDynamicAdminClient: () => db.client,
}));

const NOW = Date.parse("2026-09-17T09:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(NOW - days * DAY_MS).toISOString();
}

function faqRow(id: string, patch: Row = {}): Row {
  return {
    id,
    category: "Umumiy",
    question: `Savol ${id}`,
    answer: `Javob ${id}`,
    question_ru: `Вопрос ${id}`,
    answer_ru: `Ответ ${id}`,
    status: "published",
    sort_order: 0,
    version: 1,
    updated_at: daysAgo(1),
    updated_by: "manager@watertech.uz",
    created_at: daysAgo(200),
    ...patch,
  };
}

function competitorRow(id: string, patch: Row = {}): Row {
  return { id, name: `Raqobatchi ${id}`, threat_level: "O'rta", status: "published", version: 1, updated_at: daysAgo(1), updated_by: null, ...patch };
}

function seed(table: string, rows: Row[]): void {
  db.tables.set(table, rows);
}

function inserted(kind: string): Row[] {
  return db.inserts.flatMap((batch) => batch.rows).filter((row) => row.kind === kind);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  db.tables.clear();
  db.inserts.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getContentHealth — stale", () => {
  it(`uses a ${STALE_DAYS}-day threshold: 91 days is stale, 90 and 89 are fresh`, async () => {
    expect(STALE_DAYS).toBe(90);
    seed("content_faqs", [
      faqRow("faq-91", { updated_at: daysAgo(91) }),
      faqRow("faq-90", { updated_at: daysAgo(90) }),
      faqRow("faq-89", { updated_at: daysAgo(89) }),
    ]);

    const health = await getContentHealth();
    expect(health.stale.map((row) => row.id)).toEqual(["faq-91"]);
    expect(health.staleTotal).toBe(1);
  });

  it("never reports a draft as stale — it is listed under drafts instead", async () => {
    seed("content_faqs", [faqRow("faq-draft", { status: "draft", updated_at: daysAgo(120) })]);

    const health = await getContentHealth();
    expect(health.stale).toEqual([]);
    expect(health.drafts.map((row) => row.id)).toEqual(["faq-draft"]);
  });

  it("lists stale rows oldest first, across tables", async () => {
    seed("content_faqs", [faqRow("faq-100", { updated_at: daysAgo(100) }), faqRow("faq-300", { updated_at: daysAgo(300) })]);
    seed("content_competitors", [competitorRow("comp-200", { updated_at: daysAgo(200) })]);

    const health = await getContentHealth();
    expect(health.stale.map((row) => [row.table, row.id])).toEqual([
      ["content_faqs", "faq-300"],
      ["content_competitors", "comp-200"],
      ["content_faqs", "faq-100"],
    ]);
  });
});

describe("getContentHealth — missing RU", () => {
  it("flags a published row with every *_ru column empty (null or whitespace)", async () => {
    seed("content_faqs", [
      faqRow("faq-null", { question_ru: null, answer_ru: null }),
      faqRow("faq-blank", { question_ru: "  ", answer_ru: "" }),
      faqRow("faq-full"),
    ]);

    const health = await getContentHealth();
    expect(health.missingRu.map((row) => row.id).sort()).toEqual(["faq-blank", "faq-null"]);
    expect(health.missingRuTotal).toBe(2);
  });

  // Dashboard rule: "Ruscha tarjimasi yo'q" means NO translation at all. The
  // daily scan below is stricter (any empty *_ru column) — see the scan test.
  it("does not flag a row once one *_ru column is filled", async () => {
    seed("content_faqs", [faqRow("faq-partial", { question_ru: "Вопрос", answer_ru: null })]);

    expect((await getContentHealth()).missingRu).toEqual([]);
  });

  it("ignores drafts and Uzbek-only tables", async () => {
    seed("content_faqs", [faqRow("faq-draft", { status: "draft", question_ru: null, answer_ru: null })]);
    seed("content_competitors", [competitorRow("comp-1")]);

    expect((await getContentHealth()).missingRu).toEqual([]);
  });
});

describe("runContentScan (daily scan, same thresholds)", () => {
  it("notifies once for a 91-day-old published row and not for an 89-day-old one", async () => {
    seed("content_faqs", [faqRow("faq-91", { updated_at: daysAgo(91) }), faqRow("faq-89", { updated_at: daysAgo(89) })]);

    const result = await runContentScan();
    const stale = inserted("stale_content");
    expect(stale.map((row) => row.row_id)).toEqual(["faq-91"]);
    expect(stale[0]).toMatchObject({ severity: "warning", table_name: "content_faqs", href: "/admin/faq/faq-91" });
    expect(String(stale[0]?.body)).toContain("91 kundan beri");
    expect(result).toEqual({ created: 1, skipped: 0 });
  });

  it("flags a partially translated row, listing only the still-empty *_ru column", async () => {
    seed("content_faqs", [faqRow("faq-partial", { question_ru: "Вопрос", answer_ru: null })]);

    await runContentScan();
    expect(inserted("missing_ru")).toEqual([
      expect.objectContaining({ row_id: "faq-partial", severity: "info", href: "/admin/faq/faq-partial#ru" }),
    ]);
    expect(String(inserted("missing_ru")[0]?.body)).toContain("answer_ru");
    expect(String(inserted("missing_ru")[0]?.body)).not.toContain("question_ru");
  });

  it("skips findings an unread notification already covers, and still writes the summary", async () => {
    seed("content_faqs", [faqRow("faq-91", { updated_at: daysAgo(91) })]);
    seed("admin_notifications", [
      { kind: "stale_content", table_name: "content_faqs", row_id: "faq-91", read_at: null },
    ]);

    expect(await runContentScan()).toEqual({ created: 0, skipped: 1 });
    expect(inserted("stale_content")).toEqual([]);
    expect(inserted("scan_summary")).toHaveLength(1);
  });

  it("re-notifies when the earlier notification was already read", async () => {
    seed("content_faqs", [faqRow("faq-91", { updated_at: daysAgo(91) })]);
    seed("admin_notifications", [
      { kind: "stale_content", table_name: "content_faqs", row_id: "faq-91", read_at: daysAgo(3) },
    ]);

    expect(await runContentScan()).toEqual({ created: 1, skipped: 0 });
  });
});
// === Registry coverage ============================================================
// The scan derives its table list from CONTENT_REGISTRY. Before that it named
// seven tables by hand, so content_changelog, content_contacts and content_sops
// were published, edited and never once swept.

const REGISTRY_TABLES = Object.keys(CONTENT_REGISTRY) as DashboardTableName[];

/** A published row carrying only what the scan reads: the registry's own title
 * column, the bookkeeping columns, and `published_on` for the one table whose
 * age is measured on it. Built from the registry so a new content table is
 * covered by these tests the moment it is added. */
function registryRow(table: DashboardTableName, patch: Row = {}): Row {
  const entry = CONTENT_REGISTRY[table];
  const row: Row = {
    id: `${table}-1`,
    [entry.titleColumn]: `Sarlavha (${table})`,
    status: "published",
    sort_order: 0,
    version: 1,
    updated_at: daysAgo(1),
    created_at: daysAgo(400),
    updated_by: null,
  };
  if (table === "content_changelog") row.published_on = daysAgo(1).slice(0, 10);
  return { ...row, ...patch };
}

function seedEvery(patch: (table: DashboardTableName) => Row): void {
  for (const table of REGISTRY_TABLES) seed(table, [registryRow(table, patch(table))]);
}

describe("runContentScan — registry coverage", () => {
  it("sweeps every table in CONTENT_REGISTRY, the three it used to miss included", async () => {
    expect(REGISTRY_TABLES).toHaveLength(10);
    seedEvery((table) =>
      table === "content_changelog" ? { published_on: daysAgo(91).slice(0, 10) } : { updated_at: daysAgo(91) }
    );

    await runContentScan();

    expect(new Set(inserted("stale_content").map((row) => row.table_name))).toEqual(new Set(REGISTRY_TABLES));
    for (const table of ["content_changelog", "content_contacts", "content_sops"]) {
      expect(inserted("stale_content").map((row) => row.table_name)).toContain(table);
    }
  });

  it("counts every published row it looked at in the summary", async () => {
    seedEvery(() => ({}));

    await runContentScan();

    expect(String(inserted("scan_summary")[0]?.body)).toContain(
      `Tekshirilgan nashr etilgan yozuvlar: ${REGISTRY_TABLES.length}`
    );
  });

  it("links each finding to that table's own editor", async () => {
    seedEvery((table) =>
      table === "content_changelog" ? { published_on: daysAgo(91).slice(0, 10) } : { updated_at: daysAgo(91) }
    );

    await runContentScan();

    for (const row of inserted("stale_content")) {
      const entry = CONTENT_REGISTRY[row.table_name as DashboardTableName];
      expect(row.href).toBe(`${entry.adminPath}/${row.row_id}`);
    }
  });
});

describe("runContentScan — per-table stale rules", () => {
  it("measures a changelog entry by published_on, not by when it was last saved", async () => {
    seed("content_changelog", [
      registryRow("content_changelog", { id: "old-news", published_on: daysAgo(91).slice(0, 10), updated_at: daysAgo(1) }),
    ]);

    await runContentScan();

    const stale = inserted("stale_content");
    expect(stale.map((row) => row.row_id)).toEqual(["old-news"]);
    expect(String(stale[0]?.body)).toContain("e'lon qilingan");
    expect(String(stale[0]?.body)).not.toContain("yangilanmagan");
  });

  it("leaves a freshly published entry alone however long ago the row was created", async () => {
    seed("content_changelog", [
      registryRow("content_changelog", { published_on: daysAgo(2).slice(0, 10), updated_at: daysAgo(400) }),
    ]);

    await runContentScan();
    // The row is still reported for its empty *_ru columns; what it must not
    // be is stale, which measuring `updated_at` would have made it.
    expect(inserted("stale_content")).toEqual([]);
  });

  it("measures contacts and SOPs by updated_at, like every other table", async () => {
    seed("content_contacts", [registryRow("content_contacts", { id: "sotuv-boshligi", updated_at: daysAgo(91) })]);
    seed("content_sops", [registryRow("content_sops", { id: "amocrm-lead", updated_at: daysAgo(89) })]);

    await runContentScan();

    const stale = inserted("stale_content");
    expect(stale.map((row) => row.row_id)).toEqual(["sotuv-boshligi"]);
    expect(String(stale[0]?.body)).toContain("yangilanmagan");
  });

  it("falls back to updated_at when the age column holds no usable date", async () => {
    seed("content_changelog", [
      registryRow("content_changelog", { id: "no-date", published_on: null, updated_at: daysAgo(91) }),
    ]);

    await runContentScan();
    expect(inserted("stale_content").map((row) => row.row_id)).toEqual(["no-date"]);
  });
});

describe("runContentScan — missing RU across the registry", () => {
  it("never flags the two tables with nothing to translate", async () => {
    seed("content_competitors", [registryRow("content_competitors")]);
    seed("content_products", [registryRow("content_products")]);

    expect(await runContentScan()).toEqual({ created: 0, skipped: 0 });
    expect(inserted("missing_ru")).toEqual([]);
  });

  it("flags the three tables the old hand-written list never reached", async () => {
    seed("content_changelog", [registryRow("content_changelog", { id: "cl-1" })]);
    seed("content_contacts", [registryRow("content_contacts", { id: "ct-1" })]);
    seed("content_sops", [registryRow("content_sops", { id: "sop-1" })]);

    await runContentScan();

    const missing = inserted("missing_ru");
    expect(missing.map((row) => row.table_name).sort()).toEqual([
      "content_changelog",
      "content_contacts",
      "content_sops",
    ]);
    expect(String(missing.find((row) => row.table_name === "content_contacts")?.body)).toContain("role_ru");
  });

  it("stops flagging a contact once both Russian columns are filled", async () => {
    seed("content_contacts", [registryRow("content_contacts", { role_ru: "Менеджер", topic_ru: "Продажи" })]);

    expect(await runContentScan()).toEqual({ created: 0, skipped: 0 });
  });
});
