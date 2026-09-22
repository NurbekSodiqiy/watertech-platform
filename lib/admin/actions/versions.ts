"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession } from "./guard";
import { actionErrorResult, actionFailed, actionOk, logDbError, type ActionResult } from "@/lib/admin/errors";
import { CONTENT_REGISTRY, isContentTable } from "@/lib/admin/registry";
import { revalidateContent } from "@/lib/content/revalidate";
import type { Json } from "@/lib/supabase/database.types";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
    // The registry is the allow-list: only a table the admin CMS owns can be
    // restored into, and its kind is the cache tag to clear afterwards.
    if (!isContentTable(table)) return actionFailed("validation", { field: "table" });

    const supabase = createClient();
    const { data: versionRow, error: versionError } = await supabase
      .from("content_versions")
      .select("*")
      .eq("id", versionId)
      .eq("table_name", table)
      .single();
    if (versionError || !versionRow) {
      if (versionError) logDbError("content_versions select", versionError);
      return actionFailed("not_found");
    }

    const snapshot = versionRow.snapshot;
    if (!isJsonObject(snapshot)) return actionFailed("validation", { field: "snapshot" });
    const rowId = snapshot.id;
    if (typeof rowId !== "string") return actionFailed("validation", { field: "snapshot" });

    const payload: { [key: string]: Json | undefined } = { updated_by: session.email };
    for (const [key, value] of Object.entries(snapshot)) {
      if (!SNAPSHOT_ONLY_COLUMNS.has(key)) payload[key] = value;
    }

    // Table name is a runtime value (allow-listed above), so this one write
    // goes through the column-agnostic client instead of the generated types.
    const { error: updateError } = await createClient<DynamicTablesDatabase>()
      .from(table)
      .update(payload)
      .eq("id", rowId);
    if (updateError) {
      logDbError(`${table} restore`, updateError);
      return actionFailed("unknown");
    }

    revalidateContent(CONTENT_REGISTRY[table].kind);
    return actionOk();
  } catch (e) {
    return actionErrorResult(e);
  }
}
