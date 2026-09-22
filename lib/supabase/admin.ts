import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv, getSupabaseServiceEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Service-role client — bypasses Row Level Security. Server-only: never
 * import this from a Client Component, and never expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser. Used to insert telemetry events
 * under a fixed, trusted identity rather than the caller's own RLS-scoped
 * session. */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    getSupabaseServiceEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
