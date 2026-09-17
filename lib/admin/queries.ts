import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  narrowColumn,
  rowToScript,
  rowToObjection,
  rowToFaq,
  rowToCompetitor,
  rowToPackageGroup,
  rowToProduct,
} from "@/lib/content/db";
import { competitorSchema, productSchema } from "@/lib/content/schemas";
import type { ContentBundle } from "@/lib/content/loader";
import { statusSchema } from "@/lib/admin/schemas";
import type { StatusValue } from "@/lib/admin/actions/status";
import type {
  ScriptRow,
  ObjectionRow,
  FaqRow,
  CompetitorRow,
  PackageGroupRow,
  PackageRow,
  ProductRow,
} from "@/lib/content/db";
import type { Competitor } from "@/lib/content/types";
import type { Product } from "@/lib/content/products";
import type { Tables } from "@/lib/supabase/typed";

// Reads with the RLS-scoped session client (not the cached admin loader in
// lib/content/loader.ts) so a manager's own "select all" policy returns
// draft rows too — the whole point of the admin list/edit views. Never
// cached: managers need to see their own writes immediately.

// === Admin row types ==============================================================
// Generated row types widen CHECK-constrained columns to string; the admin
// forms and DataTable need the literal unions, so every row is narrowed once
// here (logged fallback, never a throw — see narrowColumn in lib/content/db.ts).

type WithStatus<T extends { status: string }> = Omit<T, "status"> & { status: StatusValue };

export type AdminScriptRow = WithStatus<ScriptRow>;
export type AdminObjectionRow = WithStatus<ObjectionRow>;
export type AdminFaqRow = WithStatus<FaqRow>;
export type AdminCompetitorRow = Omit<WithStatus<CompetitorRow>, "threat_level"> & {
  threat_level: Competitor["threatLevel"];
};
export type AdminPackageGroupRow = WithStatus<PackageGroupRow>;
export type AdminPackageRow = WithStatus<PackageRow>;
export type AdminProductRow = Omit<WithStatus<ProductRow>, "line" | "category" | "material"> & {
  line: Product["line"];
  category: Product["category"];
  material: NonNullable<Product["material"]> | null;
};
export type ContentVersionRow = Tables<"content_versions">;

function withStatus<T extends { id: string; status: string }>(row: T): WithStatus<T> {
  return { ...row, status: narrowColumn(statusSchema, row.status, "draft", "status", row.id) };
}

function toAdminCompetitor(row: CompetitorRow): AdminCompetitorRow {
  return {
    ...withStatus(row),
    threat_level: narrowColumn(
      competitorSchema.shape.threatLevel,
      row.threat_level,
      "Ma'lumot yo'q",
      "threat_level",
      row.id
    ),
  };
}

function toAdminProduct(row: ProductRow): AdminProductRow {
  return {
    ...withStatus(row),
    line: narrowColumn(productSchema.shape.line, row.line, "ppr", "line", row.id),
    category: narrowColumn(productSchema.shape.category, row.category, "aksessuar", "category", row.id),
    material: narrowColumn(productSchema.shape.material.unwrap().nullable(), row.material, null, "material", row.id),
  };
}

// === Queries ======================================================================

export async function listScriptRows(): Promise<AdminScriptRow[]> {
  const { data, error } = await createClient().from("content_scripts").select("*").order("sort_order");
  if (error) throw new Error(`content_scripts: ${error.message}`);
  return data.map(withStatus);
}

export async function getScriptRow(id: string): Promise<AdminScriptRow | null> {
  const { data, error } = await createClient().from("content_scripts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_scripts: ${error.message}`);
  return data && withStatus(data);
}

export async function listObjectionRows(): Promise<AdminObjectionRow[]> {
  const { data, error } = await createClient().from("content_objections").select("*").order("sort_order");
  if (error) throw new Error(`content_objections: ${error.message}`);
  return data.map(withStatus);
}

export async function getObjectionRow(id: string): Promise<AdminObjectionRow | null> {
  const { data, error } = await createClient().from("content_objections").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_objections: ${error.message}`);
  return data && withStatus(data);
}

export async function listFaqRows(): Promise<AdminFaqRow[]> {
  const { data, error } = await createClient().from("content_faqs").select("*").order("sort_order");
  if (error) throw new Error(`content_faqs: ${error.message}`);
  return data.map(withStatus);
}

export async function getFaqRow(id: string): Promise<AdminFaqRow | null> {
  const { data, error } = await createClient().from("content_faqs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_faqs: ${error.message}`);
  return data && withStatus(data);
}

export async function listCompetitorRows(): Promise<AdminCompetitorRow[]> {
  const { data, error } = await createClient().from("content_competitors").select("*").order("sort_order");
  if (error) throw new Error(`content_competitors: ${error.message}`);
  return data.map(toAdminCompetitor);
}

export async function getCompetitorRow(id: string): Promise<AdminCompetitorRow | null> {
  const { data, error } = await createClient().from("content_competitors").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_competitors: ${error.message}`);
  return data && toAdminCompetitor(data);
}

export async function listPackageGroupRows(): Promise<AdminPackageGroupRow[]> {
  const { data, error } = await createClient().from("content_package_groups").select("*").order("sort_order");
  if (error) throw new Error(`content_package_groups: ${error.message}`);
  return data.map(withStatus);
}

export async function getPackageGroupRow(id: string): Promise<AdminPackageGroupRow | null> {
  const { data, error } = await createClient()
    .from("content_package_groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`content_package_groups: ${error.message}`);
  return data && withStatus(data);
}

export async function listPackageRows(): Promise<AdminPackageRow[]> {
  const { data, error } = await createClient().from("content_packages").select("*").order("sort_order");
  if (error) throw new Error(`content_packages: ${error.message}`);
  return data.map(withStatus);
}

export async function getPackageRow(id: string): Promise<AdminPackageRow | null> {
  const { data, error } = await createClient().from("content_packages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_packages: ${error.message}`);
  return data && withStatus(data);
}

export async function listProductRows(): Promise<AdminProductRow[]> {
  const { data, error } = await createClient().from("content_products").select("*").order("sort_order");
  if (error) throw new Error(`content_products: ${error.message}`);
  return data.map(toAdminProduct);
}

export async function getProductRow(id: string): Promise<AdminProductRow | null> {
  const { data, error } = await createClient().from("content_products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_products: ${error.message}`);
  return data && toAdminProduct(data);
}

export type CountableTable =
  | "content_scripts"
  | "content_objections"
  | "content_faqs"
  | "content_competitors"
  | "content_package_groups"
  | "content_packages"
  | "content_products";

export interface StatusCounts {
  total: number;
  draft: number;
}

/** Row counts for the admin overview — two `head: true` count queries, so no
 * row bodies (scripts carry large stages JSONB) ever leave the database. */
export async function countRowsByStatus(table: CountableTable): Promise<StatusCounts> {
  const supabase = createClient();
  const [totalRes, draftRes] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }),
    supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  if (totalRes.error) throw new Error(`${table}: ${totalRes.error.message}`);
  if (draftRes.error) throw new Error(`${table}: ${draftRes.error.message}`);
  return { total: totalRes.count ?? 0, draft: draftRes.count ?? 0 };
}

export interface AdminContentBundle {
  /** Unlocalised (raw *Ru twins intact) and including drafts — unlike
   * lib/content/loader.ts's getContentBundle(), which is published-only. */
  bundle: ContentBundle;
  products: Product[];
  /** Ids whose status is "published", per table — ContentBundle itself
   * carries no status, and the publish gate must tell drafts apart. */
  publishedIds: Record<CountableTable, ReadonlySet<string>>;
}

function publishedIdSet(rows: { id: string; status: StatusValue }[]): ReadonlySet<string> {
  return new Set(rows.filter((row) => row.status === "published").map((row) => row.id));
}

/** Every content row a manager can see, for the publish gate's cross-reference
 * checks (lib/agents/publish-gate). Session client like the rest of this file,
 * so it only works inside a manager's request — the cron scan never calls it. */
export async function getContentBundleAdmin(): Promise<AdminContentBundle> {
  const [scripts, objections, faqs, competitors, packageGroups, packages, products] = await Promise.all([
    listScriptRows(),
    listObjectionRows(),
    listFaqRows(),
    listCompetitorRows(),
    listPackageGroupRows(),
    listPackageRows(),
    listProductRows(),
  ]);

  return {
    bundle: {
      scripts: scripts.map(rowToScript),
      objections: objections.map(rowToObjection),
      faqs: faqs.map(rowToFaq),
      competitors: competitors.map(rowToCompetitor),
      packageGroups: packageGroups.map((group) =>
        rowToPackageGroup(
          group,
          packages.filter((pkg) => pkg.group_id === group.id)
        )
      ),
    },
    products: products.map(rowToProduct),
    publishedIds: {
      content_scripts: publishedIdSet(scripts),
      content_objections: publishedIdSet(objections),
      content_faqs: publishedIdSet(faqs),
      content_competitors: publishedIdSet(competitors),
      content_package_groups: publishedIdSet(packageGroups),
      content_packages: publishedIdSet(packages),
      content_products: publishedIdSet(products),
    },
  };
}

export async function listVersions(table: string, rowId: string): Promise<ContentVersionRow[]> {
  const { data, error } = await createClient()
    .from("content_versions")
    .select("*")
    .eq("table_name", table)
    .eq("row_id", rowId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`content_versions: ${error.message}`);
  return data;
}
