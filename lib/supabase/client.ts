import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client for Client Components — session lives in
 * cookies managed by the SDK itself, kept in sync with the server client. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
