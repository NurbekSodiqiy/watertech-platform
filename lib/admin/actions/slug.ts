"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession } from "./guard";
import { isContentTable } from "@/lib/admin/registry";
import { idSchema } from "@/lib/admin/schemas";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";

export interface IdAvailability {
  available: boolean;
}

/** The debounced hint next to a new row's id field (auto-filled from the
 * title by lib/admin/slug.ts's `toSlug`) — manager-gated like every other
 * admin read. An unauthenticated caller, an unknown table or an id that
 * doesn't match `idSchema` all answer "not available" rather than throwing:
 * a hint has no error state to show, and none of those are things the id
 * field would ever legitimately hold long enough to debounce-check. */
export async function checkContentIdAvailable(table: string, id: string): Promise<IdAvailability> {
  try {
    await requireManagerSession();
  } catch {
    return { available: false };
  }
  if (!isContentTable(table)) return { available: false };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { available: false };

  const { data, error } = await createClient<DynamicTablesDatabase>()
    .from(table)
    .select("id")
    .eq("id", parsed.data)
    .limit(1)
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) {
    console.error(`[admin] ${table} id availability:`, error.code, error.message);
    return { available: false };
  }
  return { available: data.length === 0 };
}
