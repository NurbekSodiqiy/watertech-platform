import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Server-side Supabase client for Server Components and Route Handlers —
 * reads/writes the session via the request's cookies. Writing only actually
 * succeeds from a Route Handler, Server Action, or middleware; called from
 * a plain Server Component render it throws, which is caught and ignored
 * below since middleware refreshes the session cookie on every request.
 * DB defaults to the generated Database; DynamicTablesDatabase (lib/supabase/typed.ts)
 * is only for writes whose table name is a runtime value. */
export function createClient<DB = Database>() {
  const cookieStore = cookies();

  return createServerClient<DB>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
