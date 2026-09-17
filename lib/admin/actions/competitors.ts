"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { competitorWriteSchema } from "@/lib/admin/schemas";
import { competitorToRow } from "@/lib/content/db";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { StatusValue } from "./status";

export async function upsertCompetitor(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = competitorWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...competitorToRow(parsed), status: parsed.status, updated_by: session.email };
    if (parsed.version !== undefined) {
      await updateWithVersion(
        createClient<DynamicTablesDatabase>(),
        "content_competitors",
        parsed.id,
        row,
        parsed.version
      );
    } else {
      const { error } = await supabase.from("content_competitors").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("competitors");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deleteCompetitor(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_competitors").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("competitors");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setCompetitorStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_competitors",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("competitors");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
