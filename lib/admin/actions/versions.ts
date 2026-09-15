"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
import { revalidateContent, type ContentKind } from "@/lib/content/revalidate";

const RESTORABLE_TABLES: Record<string, ContentKind> = {
  content_scripts: "scripts",
  content_objections: "objections",
  content_faqs: "faqs",
  content_competitors: "competitors",
  content_package_groups: "packages",
  content_packages: "packages",
  content_products: "products",
};

/** Columns present in a content_versions snapshot (to_jsonb(old), see
 * 0002_content_tables.sql) that must NOT be written back verbatim: id
 * targets the row via .eq() instead, and version/created_at/updated_at are
 * bookkeeping the update trigger (or the DB default) recomputes on write —
 * updated_by is set to the manager doing the restore, not the old snapshot's
 * author. */
const SNAPSHOT_ONLY_COLUMNS = new Set(["id", "version", "created_at", "updated_at", "updated_by"]);

/** Writes a content_versions snapshot back onto its row through a plain
 * UPDATE — the same BEFORE UPDATE trigger that made this version snapshots
 * the row's current state first, so a restore is itself undoable. No
 * zod re-validation: the snapshot is server-generated (never user input) and
 * was a valid row in this exact table at the time it was captured. */
export async function restoreVersion(table: string, versionId: number): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const kind = RESTORABLE_TABLES[table];
    if (!kind) return { ok: false, error: "Noma'lum jadval" };

    const supabase = createClient();
    const { data: versionRow, error: versionError } = await supabase
      .from("content_versions")
      .select("*")
      .eq("id", versionId)
      .eq("table_name", table)
      .single();
    if (versionError || !versionRow) return { ok: false, error: "Versiya topilmadi" };

    const snapshot = versionRow.snapshot as Record<string, unknown>;
    const rowId = snapshot.id;
    if (typeof rowId !== "string") return { ok: false, error: "Versiya ma'lumoti noto'g'ri" };

    const payload: Record<string, unknown> = { updated_by: session.email };
    for (const [key, value] of Object.entries(snapshot)) {
      if (!SNAPSHOT_ONLY_COLUMNS.has(key)) payload[key] = value;
    }

    const { error: updateError } = await supabase.from(table).update(payload).eq("id", rowId);
    if (updateError) return { ok: false, error: updateError.message };

    revalidateContent(kind);
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
