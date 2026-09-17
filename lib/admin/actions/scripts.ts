"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, gateBlockedResult, type ActionResult } from "./guard";
import { runPublishGate, runPublishGateOnCandidate } from "@/lib/agents/publish-gate";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { scriptWriteSchema } from "@/lib/admin/schemas";
import { scriptToRow, chain } from "@/lib/content/db";
import type { Script } from "@/lib/content/types";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
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
    const validObjectionIds = new Set((objectionRows ?? []).map((row) => row.id));
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
    if (parsed.status === "published") {
      const gate = await runPublishGateOnCandidate({ target: { table: "content_scripts", row }, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    if (parsed.version !== undefined) {
      await updateWithVersion(createClient<DynamicTablesDatabase>(), "content_scripts", parsed.id, row, parsed.version);
    } else {
      const { error } = await supabase.from("content_scripts").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
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

export async function setScriptStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    // Unpublishing never runs the gate — only a move to "published" does.
    if (status === "published") {
      const gate = await runPublishGate({ table: "content_scripts", id, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_scripts",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("scripts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
