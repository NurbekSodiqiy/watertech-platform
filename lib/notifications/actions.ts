"use server";
import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireManagerSession, actionErrorResult, type ActionResult } from "@/lib/admin/actions/guard";
import { revalidateNotificationViews } from "@/lib/notifications/revalidate";

const notificationIdSchema = z.number().int().positive();

// Session client: the manager's own RLS update policy plus the column-level
// GRANT on read_at (0007_notifications_and_gate.sql) are exactly what these
// writes need. updated_at/updated_by are stamped by the table's trigger.

export async function markRead(id: number): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const parsed = notificationIdSchema.safeParse(id);
    if (!parsed.success) return { ok: false, error: "Noto'g'ri bildirishnoma ID" };

    const { error } = await createClient()
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", parsed.data)
      .is("read_at", null);
    if (error) return { ok: false, error: error.message };

    revalidateNotificationViews();
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}

export async function markAllRead(): Promise<ActionResult> {
  try {
    await requireManagerSession();
    const { error } = await createClient()
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) return { ok: false, error: error.message };

    revalidateNotificationViews();
    return { ok: true };
  } catch (e) {
    return actionErrorResult(e);
  }
}
