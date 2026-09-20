"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, gateBlockedResult, type ActionResult } from "./guard";
import { runPublishGate, runPublishGateOnCandidate } from "@/lib/agents/publish-gate";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { contactWriteSchema } from "@/lib/admin/schemas";
import { contactToRow } from "@/lib/content/db";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { StatusValue } from "./status";

export async function upsertContact(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = contactWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...contactToRow(parsed), status: parsed.status, updated_by: session.email };
    if (parsed.status === "published") {
      const gate = await runPublishGateOnCandidate({
        target: { table: "content_contacts", row },
        actor: session.email,
      });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    if (parsed.version !== undefined) {
      await updateWithVersion(
        createClient<DynamicTablesDatabase>(),
        "content_contacts",
        parsed.id,
        row,
        parsed.version
      );
    } else {
      const { error } = await supabase.from("content_contacts").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("contacts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deleteContact(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_contacts").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("contacts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setContactStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    // Unpublishing never runs the gate — only a move to "published" does.
    if (status === "published") {
      const gate = await runPublishGate({ table: "content_contacts", id, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_contacts",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("contacts");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
