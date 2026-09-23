import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

// Service-role client (CLAUDE.md section 7): public.run_retention() (0016)
// prunes tables across every user, including rows no session role may delete,
// and EXECUTE on it is granted to service_role alone. It is called from the
// cron Route Handler, which has no user session at all.

export type RetentionResult = Database["public"]["Functions"]["run_retention"]["Returns"][number];

/** The daily retention policy (the numbers live in the SQL function only).
 * When 0016 found pg_cron and scheduled the job itself, the database already
 * runs it: the call then returns `skipped: true` and deletes nothing, so the
 * policy runs once a day whichever scheduler this project has. */
export async function runRetention(): Promise<RetentionResult> {
  const { data, error } = await createAdminClient().rpc("run_retention", { p_skip_if_scheduled: true });
  if (error) throw new Error(`run_retention: ${error.code ?? ""} ${error.message}`);
  const [row] = data ?? [];
  if (!row) throw new Error("run_retention: no result row");
  return row;
}
