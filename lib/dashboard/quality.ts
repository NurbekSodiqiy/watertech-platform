import "server-only";
import { resolveEntityLabel, resolveAdminHref, type TelemetryRow, type EntityLabelMaps } from "@/lib/telemetry/aggregate";

export interface NotHelpfulGroup {
  path: string;
  count: number;
}

/** FeedbackWidget (components/FeedbackWidget.tsx) fires `feedback` events as
 * `{ meta: { helpful } }` only — no entityType/entityId (see useTrack's
 * payload) — so `path` is the only thing that actually varies between rows.
 * Grouping by path is the closest meaningful grouping this data supports; a
 * truly per-entity breakdown would need FeedbackWidget's call sites changed
 * to pass entityType/entityId, which is out of this task's scope. Display
 * label resolution (site-config's node.title is a next-intl "nav" namespace
 * key, not literal text) is the caller's job — see QualityPanel. */
export function aggregateNotHelpful(rows: TelemetryRow[]): NotHelpfulGroup[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "feedback") continue;
    const meta = r.meta as { helpful?: boolean } | null;
    if (meta?.helpful !== false) continue;
    counts.set(r.path, (counts.get(r.path) ?? 0) + 1);
  }
  return [...counts.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count);
}

/** Known content list pages a not-helpful path can be traced back to an
 * admin section for — doc pages (amocrm guides, standards, logistics, …)
 * have no content_* row to edit, so those simply get no "Tahrirlash" link. */
const PATH_TO_ADMIN_SECTION: { prefix: string; href: string }[] = [
  { prefix: "/faq", href: "/admin/faq" },
  { prefix: "/sales-process/objections", href: "/admin/objections" },
  { prefix: "/sales-process/battle-cards", href: "/admin/competitors" },
  { prefix: "/products", href: "/admin/products" },
];

export function resolveContentAdminHref(path: string): string | null {
  const match = PATH_TO_ADMIN_SECTION.find((p) => path === p.prefix || path.startsWith(`${p.prefix}/`));
  return match ? match.href : null;
}

export interface ZeroResultQueryGroup {
  query: string;
  count: number;
  lastSeenIso: string;
}

export function aggregateZeroResultQueriesDetailed(rows: TelemetryRow[]): ZeroResultQueryGroup[] {
  const byQuery = new Map<string, { count: number; lastSeenIso: string }>();
  for (const r of rows) {
    if (r.type !== "search") continue;
    const meta = r.meta as { query?: string; resultCount?: number } | null;
    if (!meta || meta.resultCount !== 0 || !meta.query) continue;
    const key = meta.query.trim().toLowerCase();
    if (!key) continue;
    const existing = byQuery.get(key);
    if (existing) {
      existing.count += 1;
      if (r.ts > existing.lastSeenIso) existing.lastSeenIso = r.ts;
    } else {
      byQuery.set(key, { count: 1, lastSeenIso: r.ts });
    }
  }
  return [...byQuery.entries()]
    .map(([query, v]) => ({ query, ...v }))
    .sort((a, b) => b.count - a.count);
}

export interface MostViewedItem {
  label: string;
  count: number;
  adminHref: string | null;
}

const MOST_VIEWED_TYPES: ReadonlySet<TelemetryRow["type"]> = new Set(["stage_view", "objection_view", "faq_view"]);

export function aggregateMostViewed(rows: TelemetryRow[], maps: EntityLabelMaps, limit = 10): MostViewedItem[] {
  const counts = new Map<string, MostViewedItem>();
  for (const r of rows) {
    if (!MOST_VIEWED_TYPES.has(r.type)) continue;
    const key = `${r.type}:${r.entity_id ?? r.path}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        label: resolveEntityLabel(r.type, r.entity_id, r.path, maps),
        count: 1,
        adminHref: resolveAdminHref(r.type, r.entity_id),
      });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
