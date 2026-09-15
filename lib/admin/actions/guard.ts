import "server-only";
import { getServerSession } from "@/lib/auth/server-session";

export interface ManagerSession {
  email: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Every admin Server Action calls this first — throws when the caller
 * isn't a signed-in manager, so callers can wrap the rest of the action body
 * in try/catch and turn any throw (this one, a zod parse, a DB error) into
 * a typed ActionResult instead of leaking a raw error to the client. */
export async function requireManagerSession(): Promise<ManagerSession> {
  const session = await getServerSession();
  if (!session || session.role !== "manager") {
    throw new Error("Ruxsat yo'q");
  }
  return { email: session.email };
}

export function actionErrorResult(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Kutilmagan xatolik" };
}
