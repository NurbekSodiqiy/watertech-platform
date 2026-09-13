import { createClient } from "@/lib/supabase/server";
import { emailFromClaims, roleFromClaims, type Role } from "@/lib/auth/claims";

/** Server-only session read for Route Handlers and Server Components —
 * verifies the JWT locally via getClaims() (no DB round trip) and returns
 * null when there's no session or the role claim isn't a valid allow-list
 * role. Middleware already gates page access; this is for the handlers and
 * pages that need the identity themselves. */
export async function getServerSession(): Promise<{ email: string; role: Role } | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const role = roleFromClaims(claims);
  const email = emailFromClaims(claims);
  if (!role || !email) return null;

  return { email, role };
}
