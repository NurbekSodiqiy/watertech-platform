"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
import { revalidateContent } from "@/lib/content/revalidate";
import { scriptWriteSchema } from "@/lib/admin/schemas";
import { scriptToRow, chain } from "@/lib/content/db";
import type { Script } from "@/lib/content/types";
import type { StatusValue } from "./status";

export async function upsertScript(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = scriptWriteSchema.parse(input);
    const supabase = createClient();

    // objectionIds reference content_objections rows by id with no DB-level
    // FK (see lib/content/types.ts) — checked here instead, against every
    // objection a manager could see (draft or published), not just the
    // cached/published-only getObjections().
    const { data: objectionRows, error: objectionError } = await supabase.from("content_objections").select("id");
    if (objectionError) return { ok: false, error: objectionError.message };
    const validObjectionIds = new Set((objectionRows ?? []).map((row) => row.id as string));
    for (const stage of [...parsed.stages, ...(parsed.stagesRu ?? [])]) {
      const unknownId = stage.objectionIds.find((id) => !validObjectionIds.has(id));
      if (unknownId) return { ok: false, error: `Noma'lum e'tiroz ID: ${unknownId}` };
    }

    const scriptWithChain: Script = {
      id: parsed.id,
      name: parsed.name,
      cheatSheet: parsed.cheatSheet,
      stages: chain(parsed.stages),
      nameRu: parsed.nameRu,
      cheatSheetRu: parsed.cheatSheetRu,
      stagesRu: parsed.stagesRu && parsed.stagesRu.length > 0 ? chain(parsed.stagesRu) : undefined,
    };
    const row = { ...scriptToRow(scriptWithChain), status: parsed.status, updated_by: session.email };
    const { error } = await supabase.from("content_scripts").upsert(row);
    if (error) return { ok: false, error: error.message };
    revalidateContent("scripts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deleteScript(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_scripts").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("scripts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setScriptStatus(id: string, status: StatusValue): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase
      .from("content_scripts")
      .update({ status, updated_by: session.email })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("scripts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
