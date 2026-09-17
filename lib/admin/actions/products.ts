"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, gateBlockedResult, type ActionResult } from "./guard";
import { runPublishGate, runPublishGateOnCandidate } from "@/lib/agents/publish-gate";
import { revalidateContent } from "@/lib/content/revalidate";
import { updateWithVersion } from "./concurrency";
import { productWriteSchema } from "@/lib/admin/schemas";
import { productToRow } from "@/lib/content/db";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { StatusValue } from "./status";

export async function upsertProduct(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    const parsed = productWriteSchema.parse(input);
    const supabase = createClient();
    const row = { ...productToRow(parsed), status: parsed.status, updated_by: session.email };
    if (parsed.status === "published") {
      const gate = await runPublishGateOnCandidate({ target: { table: "content_products", row }, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    if (parsed.version !== undefined) {
      await updateWithVersion(
        createClient<DynamicTablesDatabase>(),
        "content_products",
        parsed.id,
        row,
        parsed.version
      );
    } else {
      const { error } = await supabase.from("content_products").upsert(row);
      if (error) return { ok: false, error: error.message };
    }
    revalidateContent("products");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const supabase = createClient();
    const { error } = await supabase.from("content_products").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateContent("products");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function setProductStatus(
  id: string,
  status: StatusValue,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const session = await requireManagerSession();
    // Unpublishing never runs the gate — only a move to "published" does.
    if (status === "published") {
      const gate = await runPublishGate({ table: "content_products", id, actor: session.email });
      if (!gate.passed) return gateBlockedResult(gate);
    }
    await updateWithVersion(
      createClient<DynamicTablesDatabase>(),
      "content_products",
      id,
      { status, updated_by: session.email },
      expectedVersion
    );
    revalidateContent("products");
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
