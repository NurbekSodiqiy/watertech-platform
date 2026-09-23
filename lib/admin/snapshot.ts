import type { Json } from "@/lib/supabase/database.types";
import type { ManagedColumn } from "@/lib/admin/registry";

// A content row as plain JSON. Two places produce one: `to_jsonb(old)` in the
// snapshot trigger (content_versions.snapshot, 0013_baseline_and_audit_integrity.sql)
// and the column-agnostic client (lib/supabase/typed.ts), which is what reads a
// content table whose name is only known at runtime. Neither knows the table's
// columns, so everything here moves whole values around and never interprets
// them — the database owns the column types.
//
// No "server-only": the version diff (lib/admin/diff.ts, components/admin/VersionDiff.tsx)
// runs on a snapshot in the browser.

export type SnapshotRow = { [column: string]: Json | undefined };

/** Columns the database and the action factory maintain, never a row's
 * content: `BookkeepingColumn` from lib/admin/registry.ts plus `created_at`
 * (the row's birth) and `id` (a restore targets the row by it, it is never
 * part of the patch). A restore writes what is left and nothing else — which
 * is how an old snapshot can no longer carry `status` back onto a live row
 * and publish around the gate. */
export const BOOKKEEPING_COLUMNS: ReadonlySet<string> = new Set([
  "id",
  "status",
  "sort_order",
  "version",
  "created_at",
  "updated_at",
  "updated_by",
]);

export function isSnapshotRow(value: Json | undefined): value is SnapshotRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The row id a snapshot is about, or null when the value is not a row. */
export function snapshotId(row: SnapshotRow): string | null {
  return typeof row.id === "string" ? row.id : null;
}

/** One column's value as text, for a title or a log line. */
export function snapshotText(row: SnapshotRow, column: string): string | null {
  const value = row[column];
  return typeof value === "string" ? value : null;
}

/** Columns a version restore leaves as they are on the live row — the
 * ManagedColumn set of lib/admin/registry.ts. A photo upload removes the
 * object the previous `image_path` named, so writing an old snapshot's
 * `image_path` back would point the row at a file that no longer exists. The
 * diff still shows them, and a restore from /admin/trash (a row with no live
 * copy) still carries them: deleting a row leaves its photo in Storage. */
export const MANAGED_COLUMNS: ReadonlySet<string> = new Set(["image_path"] satisfies ManagedColumn[]);

/** `row` without its MANAGED_COLUMNS — the part of a snapshot a version
 * restore may write onto a live row. */
export function withoutManagedColumns(row: SnapshotRow): SnapshotRow {
  const out: SnapshotRow = {};
  for (const [column, value] of Object.entries(row)) {
    if (!MANAGED_COLUMNS.has(column)) out[column] = value;
  }
  return out;
}

/** The row minus every bookkeeping column — the content a restore writes and
 * the diff compares. */
export function contentColumns(row: SnapshotRow): SnapshotRow {
  const out: SnapshotRow = {};
  for (const [column, value] of Object.entries(row)) {
    if (!BOOKKEEPING_COLUMNS.has(column)) out[column] = value;
  }
  return out;
}
