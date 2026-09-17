import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentKind } from "@/lib/content/revalidate";

// Reads with the service-role admin client, same as lib/content/loader.ts and
// for the same reason: unstable_cache runs outside the request lifecycle and
// cannot see the caller's cookies, so the RLS-scoped session client isn't an
// option here. Unlike loader.ts this deliberately does NOT filter
// status = "published" — the whole point is surfacing draft/stale/
// untranslated rows to a manager.

export type DashboardTableName =
  | "content_scripts"
  | "content_objections"
  | "content_faqs"
  | "content_competitors"
  | "content_package_groups"
  | "content_packages"
  | "content_products";

export const DASHBOARD_TABLE_KIND: Record<DashboardTableName, ContentKind> = {
  content_scripts: "scripts",
  content_objections: "objections",
  content_faqs: "faqs",
  content_competitors: "competitors",
  content_package_groups: "packages",
  content_packages: "packages",
  content_products: "products",
};

interface TableConfig {
  table: DashboardTableName;
  titleColumn: string;
  /** Nullable *_ru text columns for this table — [] means the table carries
   * no Russian translation at all (content_competitors, battle-cards stay
   * Uzbek-only; content_products' only *_ru column, name_ru, is NOT NULL at
   * the DB level so it can never be "missing"), and is excluded from the
   * missing-RU check entirely rather than always matching. */
  ruColumns: string[];
}

const TABLES: TableConfig[] = [
  { table: "content_scripts", titleColumn: "name", ruColumns: ["name_ru", "cheat_sheet_ru"] },
  {
    table: "content_objections",
    titleColumn: "label",
    ruColumns: ["label_ru", "client_says_ru", "real_meaning_ru", "response_ru"],
  },
  { table: "content_faqs", titleColumn: "question", ruColumns: ["question_ru", "answer_ru"] },
  { table: "content_competitors", titleColumn: "name", ruColumns: [] },
  { table: "content_package_groups", titleColumn: "title", ruColumns: ["title_ru", "subtitle_ru"] },
  {
    table: "content_packages",
    titleColumn: "name",
    ruColumns: ["name_ru", "delivery_time_ru", "estimated_discount_ru", "logistics_ru", "order_volume_ru", "payment_terms_ru"],
  },
  { table: "content_products", titleColumn: "name_ru", ruColumns: [] },
];

/** Shared with the daily content scan (lib/agents/stale-scan.ts). */
export const STALE_DAYS = 90;
const MAX_ROWS_PER_LIST = 20;

export interface ContentHealthRow {
  table: DashboardTableName;
  id: string;
  title: string;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
}

export interface ContentHealth {
  drafts: ContentHealthRow[];
  draftsTotal: number;
  stale: ContentHealthRow[];
  staleTotal: number;
  missingRu: ContentHealthRow[];
  missingRuTotal: number;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const getContentHealthCached = unstable_cache(
  async (): Promise<ContentHealth> => {
    const admin = createAdminClient();
    const drafts: ContentHealthRow[] = [];
    const stale: ContentHealthRow[] = [];
    const missingRu: ContentHealthRow[] = [];
    const staleBeforeIso = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await Promise.all(
      TABLES.map(async (cfg) => {
        const columns = ["id", "status", "updated_at", "updated_by", "version", cfg.titleColumn, ...cfg.ruColumns];
        // Dynamic column list — supabase-js can't type a runtime-built select
        // string against the generated schema, so the result type is pinned
        // explicitly here instead (values are still narrowed defensively
        // below), same spirit as lib/content/db.ts's narrowColumn for
        // CHECK-constrained columns.
        const { data, error } = await admin.from(cfg.table).select<string, Record<string, unknown>>(columns.join(","));
        if (error) throw new Error(`${cfg.table}: ${error.message}`);

        for (const row of data ?? []) {
          const entry: ContentHealthRow = {
            table: cfg.table,
            id: row.id as string,
            title: String(row[cfg.titleColumn] ?? row.id),
            updatedAt: row.updated_at as string,
            updatedBy: (row.updated_by as string | null) ?? null,
            version: row.version as number,
          };
          if (row.status === "draft") {
            drafts.push(entry);
          } else if (row.status === "published") {
            if ((row.updated_at as string) < staleBeforeIso) stale.push(entry);
            if (cfg.ruColumns.length > 0 && cfg.ruColumns.every((col) => isEmptyValue(row[col]))) missingRu.push(entry);
          }
        }
      })
    );

    const byRecentDesc = (a: ContentHealthRow, b: ContentHealthRow) => b.updatedAt.localeCompare(a.updatedAt);
    const byOldestFirst = (a: ContentHealthRow, b: ContentHealthRow) => a.updatedAt.localeCompare(b.updatedAt);

    drafts.sort(byRecentDesc);
    stale.sort(byOldestFirst);
    missingRu.sort(byRecentDesc);

    return {
      drafts: drafts.slice(0, MAX_ROWS_PER_LIST),
      draftsTotal: drafts.length,
      stale: stale.slice(0, MAX_ROWS_PER_LIST),
      staleTotal: stale.length,
      missingRu: missingRu.slice(0, MAX_ROWS_PER_LIST),
      missingRuTotal: missingRu.length,
    };
  },
  ["dashboard:content-health"],
  { tags: ["content"], revalidate: 300 }
);

export function getContentHealth(): Promise<ContentHealth> {
  return getContentHealthCached();
}

export function adminEditHref(table: DashboardTableName, id: string): string {
  switch (table) {
    case "content_scripts":
      return `/admin/scripts/${id}`;
    case "content_objections":
      return `/admin/objections/${id}`;
    case "content_faqs":
      return `/admin/faq/${id}`;
    case "content_competitors":
      return `/admin/competitors/${id}`;
    case "content_package_groups":
      return `/admin/packages/groups/${id}`;
    case "content_packages":
      return `/admin/packages/${id}`;
    case "content_products":
      return `/admin/products/${id}`;
  }
}
