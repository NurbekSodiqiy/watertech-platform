"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { objectionWriteSchema } from "@/lib/admin/schemas";
import { objectionToRow } from "@/lib/content/db";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { StatusValue } from "./status";

export async function upsertObjection(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = objectionWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...objectionToRow(parsed), status: parsed.status, updated_by: session.email };
    if (parsed.version !== undefined) {
      await updateWithVersion(
        createClient<DynamicTablesDatabase>(),
        "content_objections",
        parsed.id,
        row,
        parsed.version
      );
    } else {
      const { error } = await supabase.from("content_objections").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("objections");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deleteObjection(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_objections").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("objections");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setObjectionStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_objections",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("objections");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
