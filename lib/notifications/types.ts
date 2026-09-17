import { z } from "zod";
import type { Tables, TablesInsert } from "@/lib/supabase/typed";

/** Mirrors the CHECK constraints on admin_notifications (0007_notifications_and_gate.sql). */
export const notificationKindSchema = z.enum(["gate_blocked", "stale_content", "missing_ru", "scan_summary"]);
export const notificationSeveritySchema = z.enum(["info", "warning", "error"]);

export type NotificationKind = z.infer<typeof notificationKindSchema>;
export type NotificationSeverity = z.infer<typeof notificationSeveritySchema>;

/** Generated row type with the CHECK-constrained columns narrowed. */
export type NotificationRow = Omit<Tables<"admin_notifications">, "kind" | "severity"> & {
  kind: NotificationKind;
  severity: NotificationSeverity;
};

/** What the server-side writers (publish gate, content scan) insert —
 * read_at/updated_* are never set on insert. */
export type NotificationInsert = Omit<
  TablesInsert<"admin_notifications">,
  "kind" | "severity" | "id" | "created_at" | "read_at" | "updated_at" | "updated_by"
> & {
  kind: NotificationKind;
  severity: NotificationSeverity;
};
