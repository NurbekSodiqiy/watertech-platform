import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STALE_DAYS, getContentHealth } from "@/lib/dashboard/content-health";
import { runContentScan } from "@/lib/agents/stale-scan";

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
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }));

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
