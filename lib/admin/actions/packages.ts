"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
import { revalidateContent } from "@/lib/content/revalidate";
import { packageGroupWriteSchema, packageWriteSchema } from "@/lib/admin/schemas";
import { packageGroupToRow, packageToRow } from "@/lib/content/db";
import type { StatusValue } from "./status";

// === Package groups ==============================================================

export async function upsertPackageGroup(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = packageGroupWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...packageGroupToRow(parsed), status: parsed.status, updated_by: session.email };
    const { error } = await supabase.from("content_package_groups").upsert(row);
    if (error) return { ok: false, error: error.message };
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

export async function setPackageGroupStatus(id: string, status: StatusValue): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase
      .from("content_package_groups")
      .update({ status, updated_by: session.email })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
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
    const { error } = await supabase.from("content_packages").upsert(row);
    if (error) return { ok: false, error: error.message };
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

export async function setPackageStatus(id: string, status: StatusValue): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase
      .from("content_packages")
      .update({ status, updated_by: session.email })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("packages");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
