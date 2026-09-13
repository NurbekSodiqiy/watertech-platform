import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv, getServerEnv } from "@/lib/env";

/** Service-role client — bypasses Row Level Security. Server-only: never
 * import this from a Client Component, and never expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser. Used to insert telemetry events
 * under a fixed, trusted identity rather than the caller's own RLS-scoped
 * session. */
export function createAdminClient() {
  return createSupabaseClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
