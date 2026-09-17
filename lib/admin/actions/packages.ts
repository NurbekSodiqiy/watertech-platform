"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, gateBlockedResult, type ActionResult } from "./guard";
import { runPublishGate, runPublishGateOnCandidate } from "@/lib/agents/publish-gate";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { packageGroupWriteSchema, packageWriteSchema } from "@/lib/admin/schemas";
import { packageGroupToRow, packageToRow } from "@/lib/content/db";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { StatusValue } from "./status";

// === Package groups ==============================================================

export async function upsertPackageGroup(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = packageGroupWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...packageGroupToRow(parsed), status: parsed.status, updated_by: session.email };
    if (parsed.status === "published") {
      const gate = await runPublishGateOnCandidate({ target: { table: "content_package_groups", row }, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    if (parsed.version !== undefined) {
      await updateWithVersion(
        createClient<DynamicTablesDatabase>(),
        "content_package_groups",
        parsed.id,
        row,
        parsed.version
      );
    } else {
      const { error } = await supabase.from("content_package_groups").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deletePackageGroup(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_package_groups").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setPackageGroupStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    // Unpublishing never runs the gate — only a move to "published" does.
    if (status === "published") {
      const gate = await runPublishGate({ table: "content_package_groups", id, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_package_groups",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

// === Packages =====================================================================

export async function upsertPackage(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = packageWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...packageToRow(parsed, parsed.groupId), status: parsed.status, updated_by: session.email };
    if (parsed.status === "published") {
      const gate = await runPublishGateOnCandidate({ target: { table: "content_packages", row }, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    if (parsed.version !== undefined) {
      await updateWithVersion(createClient<DynamicTablesDatabase>(), "content_packages", parsed.id, row, parsed.version);
    } else {
      const { error } = await supabase.from("content_packages").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deletePackage(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_packages").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setPackageStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    // Unpublishing never runs the gate — only a move to "published" does.
    if (status === "published") {
      const gate = await runPublishGate({ table: "content_packages", id, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_packages",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
