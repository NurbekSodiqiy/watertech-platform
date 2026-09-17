import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEditHref, STALE_DAYS } from "@/lib/dashboard/content-health";
import { revalidateNotificationViews } from "@/lib/notifications/revalidate";
import type { NotificationInsert } from "@/lib/notifications/types";
import { missingRuFields, targetTitle } from "@/lib/agents/publish-gate/checks";
import type { GateTarget } from "@/lib/agents/publish-gate/types";

// Service-role client (CLAUDE.md section 7): this runs from the cron Route
// Handler with no user session at all, and admin_notifications has no insert
// policy for `authenticated` (0007_notifications_and_gate.sql).

const SCAN_ACTOR = "content-scan";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TITLE_CHARS = 120;

type AdminClient = ReturnType<typeof createAdminClient>;

interface PublishedTarget {
  target: GateTarget;
  updatedAt: string;
}

export interface ContentScanResult {
  /** stale_content + missing_ru notifications inserted (the summary row not counted). */
  created: number;
  /** Findings not inserted because an unread notification already covers them. */
  skipped: number;
}

function unwrap<Row>(table: string, result: { data: Row[] | null; error: { message: string } | null }): Row[] {
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data ?? [];
}

async function loadPublishedTargets(admin: AdminClient): Promise<PublishedTarget[]> {
  const [scripts, objections, faqs, competitors, packageGroups, packages, products] = await Promise.all([
    admin.from("content_scripts").select("*").eq("status", "published"),
    admin.from("content_objections").select("*").eq("status", "published"),
    admin.from("content_faqs").select("*").eq("status", "published"),
    admin.from("content_competitors").select("*").eq("status", "published"),
    admin.from("content_package_groups").select("*").eq("status", "published"),
    admin.from("content_packages").select("*").eq("status", "published"),
    admin.from("content_products").select("*").eq("status", "published"),
  ]);

  return [
    ...unwrap("content_scripts", scripts).map((row) => ({
      target: { table: "content_scripts" as const, row },
      updatedAt: row.updated_at,
    })),
    ...unwrap("content_objections", objections).map((row) => ({
      target: { table: "content_objections" as const, row },
      updatedAt: row.updated_at,
    })),
    ...unwrap("content_faqs", faqs).map((row) => ({
      target: { table: "content_faqs" as const, row },
      updatedAt: row.updated_at,
    })),
    ...unwrap("content_competitors", competitors).map((row) => ({
      target: { table: "content_competitors" as const, row },
      updatedAt: row.updated_at,
    })),
    ...unwrap("content_package_groups", packageGroups).map((row) => ({
      target: { table: "content_package_groups" as const, row },
      updatedAt: row.updated_at,
    })),
    ...unwrap("content_packages", packages).map((row) => ({
      target: { table: "content_packages" as const, row },
      updatedAt: row.updated_at,
    })),
    ...unwrap("content_products", products).map((row) => ({
      target: { table: "content_products" as const, row },
      updatedAt: row.updated_at,
    })),
  ];
}

function dedupKey(kind: string, table: string | null, rowId: string | null): string {
  return `${kind}:${table ?? ""}:${rowId ?? ""}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Daily sweep over published content: one `stale_content` (warning) per row
 * untouched for STALE_DAYS, one `missing_ru` (info) per row with an empty
 * *_ru column — each skipped while an unread notification for the same kind
 * and row is still in the inbox — then a single `scan_summary` (info). */
export async function runContentScan(): Promise<ContentScanResult> {
  const admin = createAdminClient();

  const [targets, unreadRes] = await Promise.all([
    loadPublishedTargets(admin),
    admin
      .from("admin_notifications")
      .select("kind, table_name, row_id")
      .is("read_at", null)
      .in("kind", ["stale_content", "missing_ru"]),
  ]);
  if (unreadRes.error) throw new Error(`admin_notifications: ${unreadRes.error.message}`);
  const unread = new Set((unreadRes.data ?? []).map((n) => dedupKey(n.kind, n.table_name, n.row_id)));

  const now = Date.now();
  const staleBefore = now - STALE_DAYS * DAY_MS;
  const inserts: NotificationInsert[] = [];
  let staleFound = 0;
  let missingRuFound = 0;
  let skipped = 0;

  for (const { target, updatedAt } of targets) {
    const { table } = target;
    const id = target.row.id;
    const title = targetTitle(target) || id;
    const href = adminEditHref(table, id);
    const updatedMs = new Date(updatedAt).getTime();

    if (updatedMs < staleBefore) {
      staleFound += 1;
      if (unread.has(dedupKey("stale_content", table, id))) {
        skipped += 1;
      } else {
        const days = Math.floor((now - updatedMs) / DAY_MS);
        inserts.push({
          kind: "stale_content",
          severity: "warning",
          title: truncate(`Eskirgan kontent: ${title}`, MAX_TITLE_CHARS),
          body: `${days} kundan beri yangilanmagan (oxirgi yangilanish: ${new Date(updatedAt).toLocaleDateString("uz-UZ")}).`,
          table_name: table,
          row_id: id,
          href,
          actor: SCAN_ACTOR,
        });
      }
    }

    const missingRu = missingRuFields(target);
    if (missingRu.length > 0) {
      missingRuFound += 1;
      if (unread.has(dedupKey("missing_ru", table, id))) {
        skipped += 1;
      } else {
        inserts.push({
          kind: "missing_ru",
          severity: "info",
          title: truncate(`Ruscha tarjima yo'q: ${title}`, MAX_TITLE_CHARS),
          body: `To'ldirilmagan maydonlar: ${missingRu.join(", ")}`,
          table_name: table,
          row_id: id,
          href: `${href}#ru`,
          actor: SCAN_ACTOR,
        });
      }
    }
  }

  if (inserts.length > 0) {
    const { error } = await admin.from("admin_notifications").insert(inserts);
    if (error) throw new Error(`admin_notifications: ${error.message}`);
  }

  const summary: NotificationInsert = {
    kind: "scan_summary",
    severity: "info",
    title: `Kunlik kontent tekshiruvi: ${inserts.length} ta yangi bildirishnoma`,
    body:
      `Tekshirilgan nashr etilgan yozuvlar: ${targets.length}. ` +
      `Eskirgan (${STALE_DAYS}+ kun): ${staleFound}. Ruscha tarjimasi to'liq emas: ${missingRuFound}. ` +
      `O'qilmagan eslatma allaqachon bor, qayta yuborilmadi: ${skipped}.`,
    href: "/dashboard/content",
    actor: SCAN_ACTOR,
  };
  const { error: summaryError } = await admin.from("admin_notifications").insert(summary);
  if (summaryError) throw new Error(`admin_notifications: ${summaryError.message}`);

  revalidateNotificationViews();
  return { created: inserts.length, skipped };
}
