export type Role = "operator" | "manager";

export const MANAGER_AREAS = ["/dashboard", "/admin"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads app_metadata.role from decoded JWT claims, returning it only when
 * it is exactly "operator" or "manager" — anything else means the caller
 * isn't on the allow-list.
 *
 * Since migration 0014 the access-token hook refuses to issue a token for an
 * email that is not an active `allowed_users` row, so a token that reaches
 * this function normally always carries one of the two roles. It stays a
 * fail-closed check for the three cases that can still produce neither: the
 * hook not enabled in the Supabase dashboard, a token minted before 0014 that
 * still carries the old `role: "none"` stamp, and malformed claims. RLS makes
 * the same distinction in the database via `private.is_member()`. */
export function roleFromClaims(claims: unknown): Role | null {
  if (!isRecord(claims)) return null;
  const appMetadata = claims.app_metadata;
  if (!isRecord(appMetadata)) return null;
  const role = appMetadata.role;
  return role === "operator" || role === "manager" ? role : null;
}

export function emailFromClaims(claims: unknown): string | null {
  if (!isRecord(claims)) return null;
  const email = claims.email;
  return typeof email === "string" ? email : null;
}

export function isManagerArea(pathname: string): boolean {
  return MANAGER_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`));
}

export function homeForRole(role: Role): string {
  return role === "manager" ? "/dashboard" : "/";
}
