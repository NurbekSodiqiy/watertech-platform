import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client for Server Components and Route Handlers —
 * reads/writes the session via the request's cookies. Writing only actually
 * succeeds from a Route Handler, Server Action, or middleware; called from
 * a plain Server Component render it throws, which is caught and ignored
 * below since middleware refreshes the session cookie on every request. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — safe to ignore.
          }
        },
      },
    }
  );
}
