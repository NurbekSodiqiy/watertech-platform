import { roleFromClaims, type Role } from "@/lib/auth/claims";

export interface SessionUser {
  name: string;
  email: string;
  role: Role | null;
}

type MinimalUser = {
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

/** Builds the client-facing session shape from a Supabase user object —
 * shared by SessionProvider (from getSession()/onAuthStateChange) so every
 * consumer derives name/role the same way instead of re-reading metadata. */
export function toSessionUser(user: MinimalUser | null | undefined): SessionUser | null {
  if (!user) return null;

  const fullName = user.user_metadata?.full_name;
  const shortName = user.user_metadata?.name;
  const email = user.email ?? "";

  const name =
    (typeof fullName === "string" && fullName) ||
    (typeof shortName === "string" && shortName) ||
    email ||
    "Foydalanuvchi";

  return {
    name,
    email,
    role: roleFromClaims({ app_metadata: user.app_metadata }),
  };
}
