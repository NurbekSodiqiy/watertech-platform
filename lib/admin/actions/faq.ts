"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { faqWriteSchema } from "@/lib/admin/schemas";
import { faqToRow } from "@/lib/content/db";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { StatusValue } from "./status";

export async function upsertFaq(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = faqWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...faqToRow(parsed), status: parsed.status, updated_by: session.email };
    if (parsed.version !== undefined) {
      await updateWithVersion(createClient<DynamicTablesDatabase>(), "content_faqs", parsed.id, row, parsed.version);
    } else {
      const { error } = await supabase.from("content_faqs").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("faqs");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_faqs").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("faqs");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setFaqStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_faqs",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("faqs");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
