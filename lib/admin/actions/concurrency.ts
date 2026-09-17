import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { Json } from "@/lib/supabase/database.types";
import { VersionConflictError } from "@/lib/admin/version-conflict";

export { VersionConflictError } from "@/lib/admin/version-conflict";

/** Optimistic-concurrency update: the BEFORE UPDATE trigger
 * (snapshot_content_version, 0002_content_tables.sql) bumps `version` on
 * every UPDATE, so a stale `expectedVersion` simply matches no row instead
 * of overwriting a change the manager never saw. Table name is a runtime
 * value here (each action file's own literal table lives in its own typed
 * client elsewhere), so this goes through the same column-agnostic client
 * lib/admin/actions/versions.ts's restoreVersion already uses. */
export async function updateWithVersion(
  supabase: SupabaseClient<DynamicTablesDatabase>,
  table: string,
  id: string,
  patch: { [key: string]: Json | undefined },
  expectedVersion: number
): Promise<void> {
  const { data, error } = await supabase.from(table).update(patch).eq("id", id).eq("version", expectedVersion).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new VersionConflictError();
}
