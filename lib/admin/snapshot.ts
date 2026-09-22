import type { Json } from "@/lib/supabase/database.types";

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

/** The row minus every bookkeeping column — the content a restore writes and
 * the diff compares. */
export function contentColumns(row: SnapshotRow): SnapshotRow {
  const out: SnapshotRow = {};
  for (const [column, value] of Object.entries(row)) {
    if (!BOOKKEEPING_COLUMNS.has(column)) out[column] = value;
  }
  return out;
}
