"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "./guard";
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
