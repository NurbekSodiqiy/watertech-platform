"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession } from "@/lib/admin/actions/guard";
import { actionErrorResult, actionFailed, actionOk, gateBlockedResult, type ActionResult } from "@/lib/admin/errors";
import { isContentTable } from "@/lib/admin/registry";
import { runPublishGate } from "@/lib/agents/publish-gate";
import { updateWithVersion } from "@/lib/admin/actions/concurrency";
import { revalidateContent } from "@/lib/content/revalidate";
import { DASHBOARD_TABLE_KIND } from "@/lib/dashboard/content-health";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { Json } from "@/lib/supabase/database.types";

async function writeAndRevalidate(
  table: string,
  id: string,
  expectedVersion: number,
  patch: { [key: string]: Json | undefined },
  session: { email: string }
): Promise<ActionResult> {
  if (!isContentTable(table)) return actionFailed("validation", { field: "table" });
  await updateWithVersion(
    createClient<DynamicTablesDatabase>(),
    table,
    id,
    { ...patch, updated_by: session.email },
    expectedVersion
  );
  revalidateContent(DASHBOARD_TABLE_KIND[table]);
  revalidatePath("/[locale]/dashboard/content", "page");
  return actionOk();
}

export async function publishFromDashboard(table: string, id: string, expectedVersion: number): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    if (!isContentTable(table)) return actionFailed("validation", { field: "table" });
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
