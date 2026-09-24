"use server";
"use server";
import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdminSession } from "./guard";
import { actionErrorResult, actionFailed, actionOk, logDbError, type ActionResult } from "@/lib/admin/errors";
import { adminErrorMap } from "@/lib/admin/validation";
import { CONTENT_REGISTRY, isContentTable } from "@/lib/admin/registry";
import { idSchema } from "@/lib/admin/schemas";
import { revalidateContent } from "@/lib/content/revalidate";

/** One list's worth of rows. The largest content table here is the product
 * catalog; the cap is a guard on the payload, not a product decision. */
const MAX_REORDER_ROWS = 500;

const reorderSchema = z
  .object({
    orderedIds: z.array(idSchema).min(1).max(MAX_REORDER_ROWS),
    expectedVersions: z.array(z.number().int().nonnegative()).min(1).max(MAX_REORDER_ROWS),
  })
  .refine((value) => value.orderedIds.length === value.expectedVersions.length, {
    message: "invalid",
    path: ["expectedVersions"],
  })
  .refine((value) => new Set(value.orderedIds).size === value.orderedIds.length, {
    message: "invalid",
    path: ["orderedIds"],
  });

/** SQLSTATEs public.reorder_content_rows raises (0015_reorder_rows.sql). */
const SQLSTATE = { badArguments: "WT400", notAdmin: "WT403", conflict: "WT409" };

/** Writes a whole list's `sort_order` in one go: row i gets `sort_order = i`,
 * and only if its `version` still matches what the admin's page had. The
 * loop runs inside a Postgres function so the whole reorder is one statement
 * — either every row moves or none does, which is what keeps a list from
 * ending up half-sorted when someone else saved one of its rows meanwhile.
 *
 * SECURITY INVOKER, so the admin's own RLS update policy is still what
 * authorises each write. Called directly from DataTable's reorder mode (S12)
 * — table-generic already (validated against `isContentTable`), so there is
 * no per-table wrapper the way create/update/delete/setStatus each get.
 */
export async function reorderRows(
  table: string,
  orderedIds: string[],
  expectedVersions: number[]
): Promise<ActionResult> {
  try {
    await requireAdminSession();
    if (!isContentTable(table)) return actionFailed("validation", { field: "table" });
    const args = reorderSchema.parse({ orderedIds, expectedVersions }, { errorMap: adminErrorMap });

    const { error } = await createClient().rpc("reorder_content_rows", {
      p_table: table,
      p_ids: args.orderedIds,
      p_versions: args.expectedVersions,
    });
    if (error) {
      logDbError(`${table} reorder`, error);
      if (error.code === SQLSTATE.conflict) return actionFailed("version_conflict");
      if (error.code === SQLSTATE.notAdmin) return actionFailed("unauthorized");
      if (error.code === SQLSTATE.badArguments) return actionFailed("validation");
      return actionFailed("unknown");
    }

    revalidateContent(CONTENT_REGISTRY[table].kind);
    return actionOk();
  } catch (e) {
    return actionErrorResult(e);
  }
}
