import "server-only";
import { getServerSession } from "@/lib/auth/server-session";
import type { GateResult } from "@/lib/agents/publish-gate/types";

export interface ManagerSession {
  email: string;
}

/** `gate` is set only when the publish gate blocked the write — the client
 * shows its report in a dialog (components/admin/GateReportDialog.tsx). */
export type ActionResult = { ok: true } | { ok: false; error: string; gate?: GateResult };

export function gateBlockedResult(gate: GateResult): ActionResult {
  return { ok: false, error: "Nashr qorovuli to'xtatdi", gate };
}

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
