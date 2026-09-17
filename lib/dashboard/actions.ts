"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  requireManagerSession,
  actionErrorResult,
  gateBlockedResult,
  type ActionResult,
} from "@/lib/admin/actions/guard";
import { runPublishGate } from "@/lib/agents/publish-gate";
import { updateWithVersion } from "@/lib/admin/actions/concurrency";
import { revalidateContent } from "@/lib/content/revalidate";
import { DASHBOARD_TABLE_KIND, type DashboardTableName } from "@/lib/dashboard/content-health";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { Json } from "@/lib/supabase/database.types";

function isDashboardTable(table: string): table is DashboardTableName {
  return Object.prototype.hasOwnProperty.call(DASHBOARD_TABLE_KIND, table);
}

async function writeAndRevalidate(
  table: string,
  id: string,
  expectedVersion: number,
  patch: { [key: string]: Json | undefined },
  session: { email: string }
): Promise<ActionResult> {
  if (!isDashboardTable(table)) return { ok: false, error: "Noma'lum jadval" };
  await updateWithVersion(
    createClient<DynamicTablesDatabase>(),
    table,
    id,
    { ...patch, updated_by: session.email },
    expectedVersion
  );
  revalidateContent(DASHBOARD_TABLE_KIND[table]);
  revalidatePath("/[locale]/dashboard/content", "page");
  return { ok: true };
}

export async function publishFromDashboard(table: string, id: string, expectedVersion: number): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    if (!isDashboardTable(table)) return { ok: false, error: "Noma'lum jadval" };
    const gate = await runPublishGate({ table, id, actor: session.email });
    if (!gate.passed) return gateBlockedResult(gate);
    return await writeAndRevalidate(table, id, expectedVersion, { status: "published" }, session);
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function unpublishFromDashboard(table: string, id: string, expectedVersion: number): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    return await writeAndRevalidate(table, id, expectedVersion, { status: "draft" }, session);
  } catch (e) {
    return actionErrorResult(e);
  }
}

/** No-op update — its only effect is `updated_by` (and, via the BEFORE
 * UPDATE trigger, `updated_at`/`version`) so a manager can clear an item off
 * the "stale" list after confirming its content is still accurate, without
 * having to open the editor and re-save every field. */
export async function touchContent(table: string, id: string, expectedVersion: number): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    return await writeAndRevalidate(table, id, expectedVersion, {}, session);
  } catch (e) {
    return actionErrorResult(e);
  }
}
