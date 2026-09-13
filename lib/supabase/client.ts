import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/** Browser-side Supabase client for Client Components — session lives in
 * cookies managed by the SDK itself, kept in sync with the server client. */
export function createClient() {
  return createBrowserClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
