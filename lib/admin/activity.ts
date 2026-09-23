import { CONTENT_REGISTRY, isContentTable } from "@/lib/admin/registry";
import type { DashboardTableName } from "@/lib/dashboard/content-health";
import { isValidDateString, tashkentDayRangeUTC } from "@/lib/telemetry/aggregate";

// /admin/activity: one feed over three append-only histories — content edits and
// deletes (content_versions), publish-gate runs (content_gate_reports) and
// allow-list changes (access_audit). This file is the pure half: the item
// shapes, the filters read from the URL, the row -> item mappers and the merge.
// The queries themselves are in lib/admin/activity-queries.ts.

// === Items ==========================================================================

export const ACTIVITY_SOURCES = ["version", "gate", "access"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

interface ActivityBase {
  /** Unique within its source only; `activityKey` makes it unique in the feed. */
  id: number;
  /** ISO timestamp as the database sent it. */
  at: string;
  actor: string | null;
}

/** An edit (`update`) or a delete of a content row. The snapshot is the row as
 * it was *before* the change, so `title` is the name the row had until then. */
export interface VersionActivity extends ActivityBase {
  kind: "version";
  table: DashboardTableName;
  rowId: string;
  title: string;
  op: "update" | "delete";
}

/** One run of the publish gate on a row. The gate stores ids, not titles, so
 * `title` is resolved from the live row after the page is cut (null = the row
 * is gone or unreadable). */
export interface GateActivity extends ActivityBase {
  kind: "gate";
  table: DashboardTableName;
  rowId: string;
  title: string | null;
  passed: boolean;
}

/** One change to public.allowed_users. */
export interface AccessActivity extends ActivityBase {
  kind: "access";
  /** Never null: access_audit.actor is NOT NULL. */
  actor: string;
  targetEmail: string;
  action: "insert" | "update" | "delete";
  changes: AccessFieldChange[];
}

export type ActivityItem = VersionActivity | GateActivity | AccessActivity;

/** What changed on an allow-list row — only the two fields a manager acts on.
 * `null` on one side means the row did not exist there (insert / delete). */
export type AccessFieldChange =
  | { field: "role"; from: string | null; to: string | null }
  | { field: "is_active"; from: boolean | null; to: boolean | null };

export function activityKey(item: ActivityItem): string {
  return `${item.kind}:${item.id}`;
}

// === Filters =========================================================================

export interface ActivityFilters {
  source: ActivitySource | null;
  table: DashboardTableName | null;
  actor: string | null;
  /** Tashkent calendar dates (YYYY-MM-DD), inclusive; from <= to when both are set. */
  from: string | null;
  to: string | null;
}

/** A manager's typed actor filter — an email, or a role name like
 * `service_role`, so a modest cap. */
export const MAX_ACTOR_LENGTH = 200;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isActivitySource(value: string | undefined): value is ActivitySource {
  return ACTIVITY_SOURCES.some((source) => source === value);
}

/** ?source&table&actor&from&to. A value that does not parse is dropped — the
 * feed then shows what it would without that filter, never an error page for
 * a hand-edited URL. */
export function parseActivityFilters(params: Record<string, string | string[] | undefined>): ActivityFilters {
  const source = single(params.source);
  const table = single(params.table);
  const actor = single(params.actor)?.trim().slice(0, MAX_ACTOR_LENGTH);
  const rawFrom = single(params.from);
  const rawTo = single(params.to);

  let from = isValidDateString(rawFrom) ? rawFrom : null;
  let to = isValidDateString(rawTo) ? rawTo : null;
  if (from && to && from > to) [from, to] = [to, from];

  return {
    source: isActivitySource(source) ? source : null,
    table: table !== undefined && isContentTable(table) ? table : null,
    actor: actor ? actor : null,
    from,
    to,
  };
}

/** The filter set as URL params, for links that keep it (pagination). */
export function activityFilterParams(filters: ActivityFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.table) params.set("table", filters.table);
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params;
}

/** Which sources a filter set can produce rows from. A content table narrows
 * the feed to the two content histories — an access_audit row has no table. */
export function activeSources(filters: ActivityFilters): ActivitySource[] {
  return ACTIVITY_SOURCES.filter((source) => {
    if (filters.source && filters.source !== source) return false;
    if (filters.table && source === "access") return false;
    return true;
  });
}

/** The date filter as `[from, to)` UTC instants (the Tashkent day of `from`
 * through the end of the Tashkent day of `to`); either bound may be absent. */
export function activityWindow(filters: ActivityFilters): { fromUTC: string | null; toUTC: string | null } {
  return {
    fromUTC: filters.from ? tashkentDayRangeUTC(filters.from).startUTC : null,
    toUTC: filters.to ? tashkentDayRangeUTC(filters.to).endUTC : null,
  };
}

/** Escapes `\`, `%` and `_` so a typed actor is matched literally by an
 * `ilike` — `service_role` must not also match `serviceXrole`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// === Paging ===========================================================================

export const ACTIVITY_PAGE_SIZE = 25;

/** PostgREST's default max-rows: a request cannot return more than this many
 * rows, so a source cannot be read deeper than this. */
export const ACTIVITY_MAX_WINDOW = 1000;

/** The deepest page whose window still fits: page p reads p * pageSize + 1 rows. */
export const ACTIVITY_MAX_PAGE = Math.floor((ACTIVITY_MAX_WINDOW - 1) / ACTIVITY_PAGE_SIZE);

/** Rows each source must supply for page `page` to be correct: a merged feed
 * cannot be paged by giving every source the same offset (the 30th newest item
 * overall may be a source's 2nd or its 30th), so each source is read from its
 * newest row down to the last row this page could need, plus one more to know
 * whether an older page exists. `.range(0, window - 1)`. */
export function activityWindowSize(page: number, pageSize: number = ACTIVITY_PAGE_SIZE): number {
  return page * pageSize + 1;
}

// === Merge ===========================================================================

const KIND_RANK: Record<ActivityItem["kind"], number> = { version: 0, gate: 1, access: 2 };

function instant(iso: string): number {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

/** Newest first. Ties (the same instant) go to the source order version, gate,
 * access and then to the higher id, so the order — and with it the page a row
 * lands on — never depends on which query answered first. */
export function compareActivity(a: ActivityItem, b: ActivityItem): number {
  return instant(b.at) - instant(a.at) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.id - a.id;
}

export interface ActivityPageSlice {
  items: ActivityItem[];
  /** An older item exists beyond this page. */
  hasMore: boolean;
}

/** Merges the sources' rows into one newest-first list and cuts one page out
 * of it. Every source must have been read with `activityWindowSize` for this
 * page (or deeper) — with less, an older item of a shallow source could be
 * missing from the middle of the page. */
export function mergeActivity(
  sources: readonly (readonly ActivityItem[])[],
  { page, pageSize = ACTIVITY_PAGE_SIZE }: { page: number; pageSize?: number }
): ActivityPageSlice {
  const merged = sources.flat().sort(compareActivity);
  const offset = (page - 1) * pageSize;
  return { items: merged.slice(offset, offset + pageSize), hasMore: merged.length > offset + pageSize };
}

// === Row -> item ======================================================================

export interface VersionActivityRow {
  id: number;
  created_at: string;
  table_name: string;
  row_id: string;
  actor: string | null;
  op: string;
  /** The row's registry title column, read out of the snapshot by the query. */
  title: string | null;
}

export function versionRowToItem(row: VersionActivityRow): VersionActivity | null {
  if (!isContentTable(row.table_name)) return null;
  if (row.op !== "update" && row.op !== "delete") return null;
  return {
    kind: "version",
    id: row.id,
    at: row.created_at,
    actor: row.actor,
    table: row.table_name,
    rowId: row.row_id,
    title: row.title?.trim() ? row.title : row.row_id,
    op: row.op,
  };
}

export interface GateActivityRow {
  id: number;
  created_at: string;
  table_name: string;
  row_id: string;
  actor: string | null;
  passed: boolean;
}

export function gateRowToItem(row: GateActivityRow): GateActivity | null {
  if (!isContentTable(row.table_name)) return null;
  return {
    kind: "gate",
    id: row.id,
    at: row.created_at,
    actor: row.actor,
    table: row.table_name,
    rowId: row.row_id,
    title: null,
    passed: row.passed,
  };
}

export interface AccessActivityRow {
  id: number;
  created_at: string;
  actor: string;
  target_email: string;
  action: string;
  before?: unknown;
  after?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function flagOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** The role / active-flag differences between the two snapshots of an
 * allow-list row. An insert lists what the row started with, a delete what it
 * had; an update lists only the fields that differ. */
export function describeAccessChange(action: "insert" | "update" | "delete", before: unknown, after: unknown): AccessFieldChange[] {
  const previous = asRecord(before);
  const next = asRecord(after);
  const changes: AccessFieldChange[] = [];

  const roleFrom = textOrNull(previous?.role);
  const roleTo = textOrNull(next?.role);
  if (action !== "update" || roleFrom !== roleTo) changes.push({ field: "role", from: roleFrom, to: roleTo });

  // A row written before is_active existed has no flag on either side; an
  // insert or delete lists the flag only when there is one to show.
  const activeFrom = flagOrNull(previous?.is_active);
  const activeTo = flagOrNull(next?.is_active);
  const activeChanged = action === "update" ? activeFrom !== activeTo : activeFrom !== null || activeTo !== null;
  if (activeChanged) changes.push({ field: "is_active", from: activeFrom, to: activeTo });

  return changes;
}

export function accessRowToItem(row: AccessActivityRow): AccessActivity | null {
  if (row.action !== "insert" && row.action !== "update" && row.action !== "delete") return null;
  return {
    kind: "access",
    id: row.id,
    at: row.created_at,
    actor: row.actor,
    targetEmail: row.target_email,
    action: row.action,
    changes: describeAccessChange(row.action, row.before, row.after),
  };
}

// === Links ============================================================================

/** Where a content item's row is edited. */
export function editHref(table: DashboardTableName, rowId: string): string {
  return `${CONTENT_REGISTRY[table].adminPath}/${encodeURIComponent(rowId)}`;
}

/** The row's version history — the page that shows the diff of an edit. */
export function historyHref(table: DashboardTableName, rowId: string): string {
  return `/admin/versions/${table}/${encodeURIComponent(rowId)}`;
}
