import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { competitors } from "@/lib/content/competitors";
import { packageGroups } from "@/lib/content/packages";
import type { TelemetryEventType } from "./types";

/** Shape of a row as it comes back from `telemetry_events` — snake_case,
 * unlike the client-side TelemetryEvent. */
export interface TelemetryRow {
  id: number;
  user_email: string;
  session_id: string;
  ts: string;
  type: TelemetryEventType;
  path: string;
  entity_type: string | null;
  entity_id: string | null;
  duration_ms: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// Uzbekistan runs a single, DST-free UTC+5 offset year-round, so a fixed
// offset is correct here without pulling in a timezone library — this
// wouldn't hold for an app spanning multiple timezones.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function todayInTashkent(): string {
  return new Date(Date.now() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDateString(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

/** Converts a Tashkent calendar date (YYYY-MM-DD) into the matching
 * [start, end) UTC instant range, for querying the timestamptz `ts` column. */
export function tashkentDayRangeUTC(dateStr: string): { startUTC: string; endUTC: string } {
  const startUTC = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - TASHKENT_OFFSET_MS);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { startUTC: startUTC.toISOString(), endUTC: endUTC.toISOString() };
}

// --- Human-readable labels for viewed entities, from data that already
// exists (no new content) — a raw id like "obj-qimmat" means nothing to a
// manager glancing at the dashboard.
const scriptNameById = new Map(scripts.map((s) => [s.id, s.name]));
const stageLabelById = new Map(scripts.flatMap((s) => s.stages.map((st) => [st.id, `${s.name} — ${st.label}`] as const)));
const objectionLabelById = new Map(objections.map((o) => [o.id, o.label]));
const competitorNameById = new Map(competitors.map((c) => [c.id, c.name]));
const packageNameById = new Map(packageGroups.flatMap((g) => g.packages.map((p) => [p.id, p.name] as const)));

export function resolveEntityLabel(type: TelemetryEventType, entityId: string | null, path: string): string {
  if (!entityId) return path;
  switch (type) {
    case "script_select":
      return scriptNameById.get(entityId) ?? entityId;
    case "stage_view":
      return stageLabelById.get(entityId) ?? entityId;
    case "objection_view":
      return objectionLabelById.get(entityId) ?? entityId;
    case "competitor_view":
      return competitorNameById.get(entityId) ?? entityId;
    case "package_view":
      return packageNameById.get(entityId) ?? entityId;
    case "faq_view":
      return entityId; // already the question text — see scripts/page.tsx tracking
    default:
      return entityId;
  }
}

// Mirrors app/company/onboarding/page.tsx's DAYS array (7+5+5+6 items).
// Not imported from there directly — Next.js's generated page types only
// allow a page.tsx module to export its recognized special names
// (default, metadata, etc.), so an arbitrary named export from a page file
// fails typechecking. Update this alongside DAYS if the checklist changes.
export const TOTAL_ONBOARDING_ITEMS = 23;

const VIEW_TYPES: ReadonlySet<TelemetryEventType> = new Set([
  "script_select",
  "stage_view",
  "objection_view",
  "competitor_view",
  "package_view",
  "faq_view",
]);

export interface OperatorSummary {
  email: string;
  activeMs: number;
  topViewed: { label: string; count: number }[];
  copyCount: number;
  checklistCompleted: number;
  checklistTotal: number;
  checklistPercent: number | null;
}

/** Total idle time for one operator's events — idle_start/idle_end are
 * paired sequentially per session_id (they alternate by construction on
 * the client, so a simple scan is sufficient; an unmatched trailing
 * idle_start, e.g. the operator went idle and the page was closed before
 * idle_end could fire, contributes nothing rather than guessing an end). */
function computeIdleMs(rows: TelemetryRow[]): number {
  const pendingStartBySession = new Map<string, string>();
  let total = 0;
  const idleEvents = rows
    .filter((r) => r.type === "idle_start" || r.type === "idle_end")
    .sort((a, b) => a.ts.localeCompare(b.ts));

  for (const e of idleEvents) {
    if (e.type === "idle_start") {
      pendingStartBySession.set(e.session_id, e.ts);
    } else {
      const startTs = pendingStartBySession.get(e.session_id);
      if (startTs) {
        total += new Date(e.ts).getTime() - new Date(startTs).getTime();
        pendingStartBySession.delete(e.session_id);
      }
    }
  }
  return total;
}

export function aggregatePerOperator(rows: TelemetryRow[], checklistTotal: number): OperatorSummary[] {
  const byEmail = new Map<string, TelemetryRow[]>();
  for (const r of rows) {
    if (!byEmail.has(r.user_email)) byEmail.set(r.user_email, []);
    byEmail.get(r.user_email)!.push(r);
  }

  const summaries: OperatorSummary[] = [];
  for (const [email, evs] of byEmail) {
    const pageLeaveMs = evs.filter((e) => e.type === "page_leave").reduce((sum, e) => sum + (e.duration_ms ?? 0), 0);
    const activeMs = Math.max(0, pageLeaveMs - computeIdleMs(evs));

    const counts = new Map<string, { label: string; count: number }>();
    for (const e of evs) {
      if (!VIEW_TYPES.has(e.type)) continue;
      const key = `${e.type}:${e.entity_id ?? e.path}`;
      const label = resolveEntityLabel(e.type, e.entity_id, e.path);
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { label, count: 1 });
    }
    const topViewed = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    const copyCount = evs.filter((e) => e.type === "copy").length;

    // Latest toggle per checklist item that day decides its checked state —
    // toggling an item on and off again shouldn't double-count.
    const latestCheckedByItem = new Map<string, boolean>();
    for (const e of evs
      .filter((e) => e.type === "checklist_toggle" && e.entity_id)
      .sort((a, b) => a.ts.localeCompare(b.ts))) {
      latestCheckedByItem.set(e.entity_id as string, !!(e.meta as { checked?: boolean } | null)?.checked);
    }
    const checklistCompleted = [...latestCheckedByItem.values()].filter(Boolean).length;

    summaries.push({
      email,
      activeMs,
      topViewed,
      copyCount,
      checklistCompleted,
      checklistTotal,
      checklistPercent: checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : null,
    });
  }

  return summaries.sort((a, b) => b.activeMs - a.activeMs);
}

export function aggregateZeroResultSearches(rows: TelemetryRow[]): { query: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "search") continue;
    const meta = r.meta as { query?: string; resultCount?: number } | null;
    if (!meta || meta.resultCount !== 0 || !meta.query) continue;
    const key = meta.query.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count);
}

// Mirrors DailyTimeline's own `schedule` (components/DailyTimeline.tsx),
// duplicated rather than imported since that array isn't exported and
// touching that file isn't warranted just for this. Update both together
// if the daily plan changes.
export const PLANNED_HOURS: { startHour: number; endHour: number; task: string }[] = [
  { startHour: 9, endHour: 10, task: "Kunni rejalashtirish" },
  { startHour: 9, endHour: 11, task: "Yangi lidlarga qo'ng'iroq" },
  { startHour: 11, endHour: 12, task: "CRM topshiriqlari" },
  { startHour: 13, endHour: 14, task: "Yangi lidlarga qo'ng'iroq" },
  { startHour: 14, endHour: 16, task: "Qayta aloqa" },
  { startHour: 16, endHour: 17, task: "Hisobot va tekshiruv" },
];

/** Actual event counts per Tashkent-local hour, for comparing against
 * PLANNED_HOURS. Server-side `Date#getHours()` follows the server's own
 * timezone, not Tashkent's, so the offset is applied explicitly first. */
export function aggregateHourly(rows: TelemetryRow[]): number[] {
  const counts = new Array(24).fill(0);
  for (const r of rows) {
    const hour = new Date(new Date(r.ts).getTime() + TASHKENT_OFFSET_MS).getUTCHours();
    counts[hour] += 1;
  }
  return counts;
}
