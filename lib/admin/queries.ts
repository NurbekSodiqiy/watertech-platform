import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ScriptRow,
  ObjectionRow,
  FaqRow,
  CompetitorRow,
  PackageGroupRow,
  PackageRow,
  ProductRow,
} from "@/lib/content/db";

// Reads with the RLS-scoped session client (not the cached admin loader in
// lib/content/loader.ts) so a manager's own "select all" policy returns
// draft rows too — the whole point of the admin list/edit views. Never
// cached: managers need to see their own writes immediately.

export async function listScriptRows(): Promise<ScriptRow[]> {
  const { data, error } = await createClient().from("content_scripts").select("*").order("sort_order");
  if (error) throw new Error(`content_scripts: ${error.message}`);
  return data as ScriptRow[];
}

export async function getScriptRow(id: string): Promise<ScriptRow | null> {
  const { data, error } = await createClient().from("content_scripts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_scripts: ${error.message}`);
  return data as ScriptRow | null;
}

export async function listObjectionRows(): Promise<ObjectionRow[]> {
  const { data, error } = await createClient().from("content_objections").select("*").order("sort_order");
  if (error) throw new Error(`content_objections: ${error.message}`);
  return data as ObjectionRow[];
}

export async function getObjectionRow(id: string): Promise<ObjectionRow | null> {
  const { data, error } = await createClient().from("content_objections").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_objections: ${error.message}`);
  return data as ObjectionRow | null;
}

export async function listFaqRows(): Promise<FaqRow[]> {
  const { data, error } = await createClient().from("content_faqs").select("*").order("sort_order");
  if (error) throw new Error(`content_faqs: ${error.message}`);
  return data as FaqRow[];
}

export async function getFaqRow(id: string): Promise<FaqRow | null> {
  const { data, error } = await createClient().from("content_faqs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_faqs: ${error.message}`);
  return data as FaqRow | null;
}

export async function listCompetitorRows(): Promise<CompetitorRow[]> {
  const { data, error } = await createClient().from("content_competitors").select("*").order("sort_order");
  if (error) throw new Error(`content_competitors: ${error.message}`);
  return data as CompetitorRow[];
}

export async function getCompetitorRow(id: string): Promise<CompetitorRow | null> {
  const { data, error } = await createClient().from("content_competitors").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_competitors: ${error.message}`);
  return data as CompetitorRow | null;
}

export async function listPackageGroupRows(): Promise<PackageGroupRow[]> {
  const { data, error } = await createClient().from("content_package_groups").select("*").order("sort_order");
  if (error) throw new Error(`content_package_groups: ${error.message}`);
  return data as PackageGroupRow[];
}

export async function getPackageGroupRow(id: string): Promise<PackageGroupRow | null> {
  const { data, error } = await createClient()
    .from("content_package_groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`content_package_groups: ${error.message}`);
  return data as PackageGroupRow | null;
}

export async function listPackageRows(): Promise<PackageRow[]> {
  const { data, error } = await createClient().from("content_packages").select("*").order("sort_order");
  if (error) throw new Error(`content_packages: ${error.message}`);
  return data as PackageRow[];
}

export async function getPackageRow(id: string): Promise<PackageRow | null> {
  const { data, error } = await createClient().from("content_packages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_packages: ${error.message}`);
  return data as PackageRow | null;
}

export async function listProductRows(): Promise<ProductRow[]> {
  const { data, error } = await createClient().from("content_products").select("*").order("sort_order");
  if (error) throw new Error(`content_products: ${error.message}`);
  return data as ProductRow[];
}

export async function getProductRow(id: string): Promise<ProductRow | null> {
  const { data, error } = await createClient().from("content_products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`content_products: ${error.message}`);
  return data as ProductRow | null;
}

export interface ContentVersionRow {
  id: number;
  table_name: string;
  row_id: string;
  snapshot: Record<string, unknown>;
  actor: string | null;
  created_at: string;
}

export async function listVersions(table: string, rowId: string): Promise<ContentVersionRow[]> {
  const { data, error } = await createClient()
    .from("content_versions")
    .select("*")
    .eq("table_name", table)
    .eq("row_id", rowId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`content_versions: ${error.message}`);
  return data as ContentVersionRow[];
}
