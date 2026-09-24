import "server-only";
import { getServerSession } from "@/lib/auth/server-session";
import { isAdminRole } from "@/lib/auth/claims";
import { AdminActionError } from "@/lib/admin/errors";

export interface AdminSession {
  email: string;
}

/** Every admin Server Action calls this first — throws when the caller isn't
 * a signed-in admin (an operator or a sales manager included), so callers can
 * wrap the rest of the action body in try/catch and turn any throw (this one,
 * a zod parse, a DB error) into a typed ActionResult via `actionErrorResult`
 * instead of leaking a raw error to the client. The result codes live in
 * lib/admin/errors.ts. */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.role)) {
    throw new AdminActionError("unauthorized");
  }
  return { email: session.email };
}
