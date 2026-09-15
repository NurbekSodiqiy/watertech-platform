export type Role = "operator" | "manager";

export const MANAGER_AREAS = ["/dashboard", "/admin"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads app_metadata.role from decoded JWT claims, returning it only when
 * it is exactly "operator" or "manager" — anything else (missing, "none",
 * malformed) means the caller isn't on the allow-list. */
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
