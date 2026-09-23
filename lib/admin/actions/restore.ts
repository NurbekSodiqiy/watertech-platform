import "server-only";
import { z } from "zod";
import {
  actionErrorResult,
  actionFailed,
  actionOk,
  gateBlockedResult,
  logDbError,
  type ActionResult,
} from "@/lib/admin/errors";
import { adminErrorMap } from "@/lib/admin/validation";
import { CONTENT_REGISTRY, gateTargetFor, isContentTable, type AdminDbClient } from "@/lib/admin/registry";
import {
  contentColumns,
  isSnapshotRow,
  snapshotId,
  withoutManagedColumns,
  type SnapshotRow,
} from "@/lib/admin/snapshot";
import type { Json } from "@/lib/supabase/database.types";
import { contentActionsFor, type ContentActionDeps } from "./factory";
import { updateWithVersion } from "./concurrency";

// Writing a content_versions snapshot back onto its row. Not a "use server"
// file for the same reason factory.ts is not: it takes its dependencies as an
// argument, so tests/unit/admin/restore.test.ts can drive the real supabase-js
// query builder over a mocked fetch. The Server Action surface the UI binds to
// is lib/admin/actions/versions.ts.
//
// Three rules the restore before S07 broke, and what enforces them here:
//   * a restore writes content, never `status` — an old published snapshot
//     used to republish a draft without the publish gate ever running
//     (contentColumns() drops every bookkeeping column, status included);
//   * a live published row is gated on the merged candidate first, so a
//     restore cannot put content on the operators' pages that a save of the
//     same values would have been refused for;
//   * the write is version-guarded like every other admin write, so a restore
//     cannot silently overwrite an edit made while the history page was open.

const restoreSchema = z.object({
  table: z.string().min(1, "required"),
  versionId: z.number().int().positive(),
  /** The `version` of the live row the manager was looking at — null from
   * /admin/trash, where the whole point is that there is no live row. */
  expectedVersion: z.number().int().nonnegative().nullable(),
});

export type RestoreVersionInput = z.infer<typeof restoreSchema>;

interface VersionRow {
  id: number;
  op: string;
  snapshot: Json;
}

async function loadVersion(
  supabase: AdminDbClient,
  table: string,
  versionId: number
): Promise<VersionRow | null> {
  const { data, error } = await supabase
    .from("content_versions")
    .select("id,op,snapshot")
    .eq("id", versionId)
    .eq("table_name", table)
    .limit(1)
    .overrideTypes<VersionRow[], { merge: false }>();
  if (error) {
    logDbError("content_versions select", error);
    throw new Error(error.message);
  }
  return data[0] ?? null;
}

/** The row as it is now, or null when it is gone. Read through the same
 * session client as the write, so a row RLS hides is a row that cannot be
 * restored over either. */
async function loadLiveRow(supabase: AdminDbClient, table: string, id: string): Promise<SnapshotRow | null> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .limit(1)
    .overrideTypes<SnapshotRow[], { merge: false }>();
  if (error) {
    logDbError(`${table} select`, error);
    throw new Error(error.message);
  }
  return data[0] ?? null;
}

/**
 * Restores one content_versions snapshot.
 *
 * With a live row: its content columns are overwritten with the snapshot's,
 * its `status` is left exactly as it is, and the write is guarded on
 * `expectedVersion`. A published row is gated on the merged candidate first —
 * the same gate a save would run — and a blocked gate writes nothing.
 *
 * With no live row and a snapshot the DELETE trigger wrote (`op = 'delete'`),
 * the row is re-created through the factory's insert path as a **draft**.
 * Anything else is `not_found`: there is nothing to restore onto.
 */
export async function restoreContentVersion(
  input: RestoreVersionInput,
  deps: ContentActionDeps
): Promise<ActionResult> {
  try {
    const session = await deps.requireSession();
    const parsed = restoreSchema.parse(input, { errorMap: adminErrorMap });
    // The registry is the allow-list: only a table the admin CMS owns can be
    // restored into, and its kind is the cache tag to clear afterwards.
    if (!isContentTable(parsed.table)) return actionFailed("validation", { field: "table" });
    const table = parsed.table;
    const entry = CONTENT_REGISTRY[table];
    const supabase = deps.client();

    const version = await loadVersion(supabase, table, parsed.versionId);
    if (!version) return actionFailed("not_found");
    if (!isSnapshotRow(version.snapshot)) return actionFailed("validation", { field: "snapshot" });
    const rowId = snapshotId(version.snapshot);
    if (rowId === null) return actionFailed("validation", { field: "snapshot" });

    const live = await loadLiveRow(supabase, table, rowId);
    if (!live) {
      // No live row: only a delete snapshot describes a row that is supposed
      // to be gone, and it comes back as a draft (/admin/trash).
      if (version.op !== "delete") return actionFailed("not_found");
      return await contentActionsFor(table, deps).restoreDeleted(version.snapshot);
    }

    // A row that is back (or never left) while the trash page said otherwise,
    // or one that was edited since the history page loaded: the manager has to
    // look again before overwriting it.
    if (parsed.expectedVersion === null || live.version !== parsed.expectedVersion) {
      return actionFailed("version_conflict");
    }

    // Managed columns (a product's uploaded photo) keep their live value.
    const restored = withoutManagedColumns(contentColumns(version.snapshot));
    if (live.status === "published") {
      // The row as it would be after the write, gated before anything is
      // written — a snapshot that was valid months ago can reference a
      // package or an objection that no longer exists.
      const candidate: SnapshotRow & { id: string } = { ...contentColumns(live), ...restored, id: rowId };
      const gate = await deps.runGateOnCandidate({
        target: gateTargetFor(table, candidate),
        actor: session.email,
      });
      if (!gate.passed) return gateBlockedResult(gate);
    }

    // Throws VersionConflictError when the row changed between the read above
    // and this write; `.select("id")` inside is what makes a 0-row match a
    // failure instead of a silent success.
    await updateWithVersion(supabase, table, rowId, { ...restored, updated_by: session.email }, parsed.expectedVersion);

    deps.revalidate(entry.kind);
    return actionOk();
  } catch (e) {
    return actionErrorResult(e);
  }
}
