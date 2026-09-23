import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import { CONTENT_REGISTRY, isContentTable } from "@/lib/admin/registry";
import type { DashboardTableName } from "@/lib/dashboard/content-health";
import {
  ACTIVITY_MAX_PAGE,
  ACTIVITY_PAGE_SIZE,
  accessRowToItem,
  activeSources,
  activityWindow,
  activityWindowSize,
  escapeLike,
  gateRowToItem,
  mergeActivity,
  versionRowToItem,
  type AccessActivity,
  type ActivityFilters,
  type ActivityItem,
  type GateActivity,
  type VersionActivity,
} from "@/lib/admin/activity";

// Reads for /admin/activity, with the manager's own RLS-scoped session: the
// three tables' manager-only select policies decide what comes back (0007,
// 0013, 0017). Each source is read newest-first from its top down to the last
// row the requested page could need (activityWindowSize), merged in TS, and cut
// — so a page never depends on how many rows each source happens to hold.

export interface ActivityPage {
  items: ActivityItem[];
  /** The page actually served (the requested one, clamped to ACTIVITY_MAX_PAGE). */
  page: number;
  hasMore: boolean;
  /** Older rows exist, but the deepest readable page has been reached — the
   * date filter is what gets further back. */
  truncated: boolean;
}

/** Every distinct title column of the registry. A snapshot is the whole row —
 * a script's is megabytes of stage trees — so the query pulls just these keys
 * out of the jsonb as `t_<column>` instead of the snapshot. */
const TITLE_COLUMNS = [...new Set(Object.values(CONTENT_REGISTRY).map((entry) => entry.titleColumn))];
const VERSION_COLUMNS = [
  "id",
  "created_at",
  "table_name",
  "row_id",
  "actor",
  "op",
  ...TITLE_COLUMNS.map((column) => `t_${column}:snapshot->>${column}`),
].join(",");

const versionRowSchema = z
  .object({
    id: z.number().int(),
    created_at: z.string(),
    table_name: z.string(),
    row_id: z.string(),
    actor: z.string().nullable(),
    op: z.string(),
  })
  .passthrough();

const gateRowSchema = z.object({
  id: z.number().int(),
  created_at: z.string(),
  table_name: z.string(),
  row_id: z.string(),
  actor: z.string().nullable(),
  passed: z.boolean(),
});

const accessRowSchema = z.object({
  id: z.number().int(),
  created_at: z.string(),
  actor: z.string(),
  target_email: z.string(),
  action: z.string(),
  before: z.unknown(),
  after: z.unknown(),
});

async function fetchVersions(filters: ActivityFilters, window: number): Promise<VersionActivity[]> {
  const { fromUTC, toUTC } = activityWindow(filters);
  let query = createClient().from("content_versions").select(VERSION_COLUMNS).in("op", ["update", "delete"]);
  if (filters.table) query = query.eq("table_name", filters.table);
  if (filters.actor) query = query.ilike("actor", escapeLike(filters.actor));
  if (fromUTC) query = query.gte("created_at", fromUTC);
  if (toUTC) query = query.lt("created_at", toUTC);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, window - 1);
  if (error) throw new Error(`content_versions: ${error.message}`);

  return z
    .array(versionRowSchema)
    .parse(data)
    .flatMap((row) => {
      const titleColumn = isContentTable(row.table_name) ? CONTENT_REGISTRY[row.table_name].titleColumn : null;
      const title = titleColumn ? row[`t_${titleColumn}`] : null;
      const item = versionRowToItem({ ...row, title: typeof title === "string" ? title : null });
      return item ? [item] : [];
    });
}

async function fetchGateReports(filters: ActivityFilters, window: number): Promise<GateActivity[]> {
  const { fromUTC, toUTC } = activityWindow(filters);
  let query = createClient().from("content_gate_reports").select("id,created_at,table_name,row_id,actor,passed");
  if (filters.table) query = query.eq("table_name", filters.table);
  if (filters.actor) query = query.ilike("actor", escapeLike(filters.actor));
  if (fromUTC) query = query.gte("created_at", fromUTC);
  if (toUTC) query = query.lt("created_at", toUTC);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, window - 1);
  if (error) throw new Error(`content_gate_reports: ${error.message}`);

  return z
    .array(gateRowSchema)
    .parse(data)
    .flatMap((row) => {
      const item = gateRowToItem(row);
      return item ? [item] : [];
    });
}

async function fetchAccessAudit(filters: ActivityFilters, window: number): Promise<AccessActivity[]> {
  const { fromUTC, toUTC } = activityWindow(filters);
  let query = createClient().from("access_audit").select("id,created_at,actor,target_email,action,before,after");
  if (filters.actor) query = query.ilike("actor", escapeLike(filters.actor));
  if (fromUTC) query = query.gte("created_at", fromUTC);
  if (toUTC) query = query.lt("created_at", toUTC);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, window - 1);
  if (error) throw new Error(`access_audit: ${error.message}`);

  return z
    .array(accessRowSchema)
    .parse(data)
    .flatMap((row) => {
      const item = accessRowToItem(row);
      return item ? [item] : [];
    });
}

/** Titles of the gate reports on this page, from the rows as they are now.
 * Only the page's own rows are looked up (at most one page of ids per table),
 * and a failed lookup costs the title, not the page: the row id is shown. */
async function withGateTitles(items: ActivityItem[]): Promise<ActivityItem[]> {
  const idsByTable = new Map<DashboardTableName, Set<string>>();
  for (const item of items) {
    if (item.kind !== "gate") continue;
    const ids = idsByTable.get(item.table) ?? new Set<string>();
    ids.add(item.rowId);
    idsByTable.set(item.table, ids);
  }
  if (idsByTable.size === 0) return items;

  const supabase = createClient<DynamicTablesDatabase>();
  const titles = new Map<string, string>();
  await Promise.all(
    [...idsByTable].map(async ([table, ids]) => {
      const titleColumn = CONTENT_REGISTRY[table].titleColumn;
      const { data, error } = await supabase.from(table).select(`id,${titleColumn}`).in("id", [...ids]);
      if (error) {
        console.error(`[activity] ${table} title lookup failed:`, error.code, error.message);
        return;
      }
      for (const row of z.array(z.object({ id: z.string() }).passthrough()).parse(data)) {
        const title = row[titleColumn];
        if (typeof title === "string" && title.trim() !== "") titles.set(`${table}:${row.id}`, title);
      }
    })
  );

  return items.map((item) =>
    item.kind === "gate" ? { ...item, title: titles.get(`${item.table}:${item.rowId}`) ?? null } : item
  );
}

export async function listActivity(filters: ActivityFilters, requestedPage: number): Promise<ActivityPage> {
  const page = Math.min(Math.max(requestedPage, 1), ACTIVITY_MAX_PAGE);
  const window = activityWindowSize(page);
  const sources = new Set(activeSources(filters));

  const [versions, gates, access] = await Promise.all([
    sources.has("version") ? fetchVersions(filters, window) : Promise.resolve([]),
    sources.has("gate") ? fetchGateReports(filters, window) : Promise.resolve([]),
    sources.has("access") ? fetchAccessAudit(filters, window) : Promise.resolve([]),
  ]);

  const slice = mergeActivity([versions, gates, access], { page, pageSize: ACTIVITY_PAGE_SIZE });
  return {
    items: await withGateTitles(slice.items),
    page,
    hasMore: slice.hasMore && page < ACTIVITY_MAX_PAGE,
    truncated: slice.hasMore && page >= ACTIVITY_MAX_PAGE,
  };
}
