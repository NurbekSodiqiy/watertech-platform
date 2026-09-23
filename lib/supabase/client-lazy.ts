import type { createClient } from "@/lib/supabase/client";

export type BrowserSupabaseClient = ReturnType<typeof createClient>;

let pending: Promise<BrowserSupabaseClient> | null = null;

/** The browser Supabase client, loaded on first use.
 *
 * SessionProvider, the user-state store and sign-out only touch Supabase inside
 * effects and async functions, never during render. Importing lib/supabase/client
 * statically pulled @supabase/ssr and supabase-js into the first-load bundle of
 * every operator route (CLAUDE.md section 4, docs/PERF.md); going through this
 * loader moves them into an async chunk that arrives after first paint.
 *
 * One promise, one client: every caller shares the same instance, which is what
 * the store's former module-level singleton guaranteed. A failed chunk load is
 * not cached, so the next call retries instead of failing for the rest of the
 * page's life. */
export function getSupabaseClient(): Promise<BrowserSupabaseClient> {
  if (!pending) {
    pending = import("@/lib/supabase/client").then(({ createClient: create }) => create());
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}
