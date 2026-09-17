import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentBundleAdmin } from "@/lib/admin/queries";
import { adminEditHref } from "@/lib/dashboard/content-health";
import { revalidateNotificationViews } from "@/lib/notifications/revalidate";
import type { NotificationInsert } from "@/lib/notifications/types";
import { runChecks, targetTitle, toGateResult } from "./checks";
import type { GateResult, GateTable, GateTarget } from "./types";

// Service-role client (CLAUDE.md section 7): content_gate_reports and
// admin_notifications have no insert policy for `authenticated` by design
// (0007_notifications_and_gate.sql) — only this server code writes them. The
// row under test is read with it too, so the verdict never depends on what
// the caller's own session happens to be allowed to see.

const MAX_TITLE_CHARS = 120;

async function loadTarget(table: GateTable, id: string): Promise<GateTarget | null> {
  const admin = createAdminClient();
  switch (table) {
    case "content_scripts": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
    case "content_objections": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
    case "content_faqs": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
    case "content_competitors": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
    case "content_package_groups": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
    case "content_packages": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
    case "content_products": {
      const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${table}: ${error.message}`);
      return data && { table, row: data };
    }
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Writes the audit row and, for a blocked publish, the manager notification.
 * Both are best-effort: the verdict is already computed, and a missing table
 * (0007 not applied yet) must not turn every publish into an error. */
async function recordGateRun(
  table: GateTable,
  id: string,
  title: string,
  result: GateResult,
  actor: string
): Promise<void> {
  const admin = createAdminClient();

  const { error: reportError } = await admin.from("content_gate_reports").insert({
    table_name: table,
    row_id: id,
    passed: result.passed,
    issues: result.issues.map((i) => ({ code: i.code, severity: i.severity, message: i.message, field: i.field ?? null })),
    actor,
  });
  if (reportError) console.error("[publish-gate] report insert failed:", reportError.message);

  if (result.passed) return;

  const notification: NotificationInsert = {
    kind: "gate_blocked",
    severity: "error",
    title: truncate(`Nashr to'xtatildi: ${title}`, MAX_TITLE_CHARS),
    body: result.issues.map((i) => i.message).join("\n"),
    table_name: table,
    row_id: id,
    href: adminEditHref(table, id),
    actor,
  };
  const { error: notificationError } = await admin.from("admin_notifications").insert(notification);
  if (notificationError) {
    console.error("[publish-gate] notification insert failed:", notificationError.message);
    return;
  }
  revalidateNotificationViews();
}

/** Validates a stored row before its status flips to "published". Callers
 * run this FIRST and skip the status update when `passed` is false. */
export async function runPublishGate({
  table,
  id,
  actor,
}: {
  table: GateTable;
  id: string;
  actor: string;
}): Promise<GateResult> {
  const target = await loadTarget(table, id);
  if (!target) {
    const result = toGateResult([{ code: "row_not_found", severity: "error", message: "Yozuv topilmadi" }]);
    await recordGateRun(table, id, id, result, actor);
    return result;
  }
  return runPublishGateOnCandidate({ target, actor });
}

/** Same gate for a row that isn't stored yet (or not in this shape): an
 * upsert saving with status "published" gates the values it is about to
 * write, so the edit form can't publish around the gate. */
export async function runPublishGateOnCandidate({
  target,
  actor,
}: {
  target: GateTarget;
  actor: string;
}): Promise<GateResult> {
  const ctx = await getContentBundleAdmin();
  const result = runChecks(target, ctx);
  await recordGateRun(target.table, target.row.id, targetTitle(target) || target.row.id, result, actor);
  return result;
}
