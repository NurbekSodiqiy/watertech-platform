import "server-only";
import { getServerSession } from "@/lib/auth/server-session";
import { AdminActionError } from "@/lib/admin/errors";

export interface ManagerSession {
  email: string;
}

/** Every admin Server Action calls this first — throws when the caller isn't
 * a signed-in manager, so callers can wrap the rest of the action body in
 * try/catch and turn any throw (this one, a zod parse, a DB error) into a
 * typed ActionResult via `actionErrorResult` instead of leaking a raw error
 * to the client. The result codes live in lib/admin/errors.ts. */
export async function requireManagerSession(): Promise<ManagerSession> {
  const session = await getServerSession();
  if (!session || session.role !== "manager") {
    throw new AdminActionError("unauthorized");
  }
  return { email: session.email };
}
