"use server";
import "server-only";
import { restoreContentVersion } from "./restore";
import { liveDeps } from "./deps";
import type { ActionResult } from "@/lib/admin/errors";

// Thin Server Action surface over ./restore.ts, the same split every other
// action file in this folder uses: the body is dependency-injected so it can
// be tested against the real query builder, and this file exists because a
// Server Action reference has to be an exported async function.

/**
 * Writes one content_versions snapshot back onto its row.
 *
 * @param table                 content table the snapshot belongs to (registry allow-list).
 * @param versionId             content_versions.id of the snapshot.
 * @param expectedCurrentVersion `version` of the live row the manager was looking at,
 *                              or null from /admin/trash, where there is no live row.
 *
 * The snapshot's `status` is never written: restoring an old published
 * snapshot onto a draft used to republish it with the publish gate never
 * running. A published row is gated on the merged candidate first, and a row
 * that only exists as a delete snapshot comes back as a draft.
 */
export async function restoreVersion(
  table: string,
  versionId: number,
  expectedCurrentVersion: number | null
): Promise<ActionResult> {
  return restoreContentVersion({ table, versionId, expectedVersion: expectedCurrentVersion }, liveDeps);
}
