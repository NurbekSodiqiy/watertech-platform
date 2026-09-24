import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  narrowColumn,
  rowToScript,
  rowToObjection,
  rowToFaq,
  rowToCompetitor,
  rowToPackageGroup,
  rowToProduct,
} from "@/lib/content/db";
import { competitorSchema, productSchema } from "@/lib/content/schemas";
import { changelogReadKey } from "@/lib/user-state/keys";
import { aggregateChangelogReads, type ChangelogReadCounts } from "@/lib/user-state/changelog";
import type { ContentBundle } from "@/lib/content/loader";
import { statusSchema } from "@/lib/admin/schemas";
import { CONTENT_REGISTRY, DEFAULT_LIST_ORDER, isContentTable, type ListColumnOf } from "@/lib/admin/registry";
import { isSnapshotRow, snapshotText } from "@/lib/admin/snapshot";
import { isUserRole, type AdminUser } from "@/lib/admin/users";
import type { StatusValue } from "@/lib/admin/actions/status";
import type { DashboardTableName } from "@/lib/dashboard/content-health";
import type {
  ScriptRow,
  ObjectionRow,
  FaqRow,
  CompetitorRow,
  PackageGroupRow,
  PackageRow,
  ProductRow,
  ChangelogRow,
  ContactRow,
  SopRow,
} from "@/lib/content/db";
import type { Competitor } from "@/lib/content/types";
import type { Product } from "@/lib/content/products";
import type { DynamicTablesDatabase, Tables } from "@/lib/supabase/typed";
import type { Json } from "@/lib/supabase/database.types";

// Reads with the RLS-scoped session client (not the cached admin loader in
// lib/content/loader.ts) so a manager's own "select all" policy returns
// draft rows too — the whole point of the admin list/edit views. Never
// cached: managers need to see their own writes immediately.
//
// Three shapes of read, one implementation each instead of two per table:
//   listRows(table)     — the list view's projection (bookkeeping columns plus
//                         the entry's listColumns). A script's stage trees are
//                         megabytes of JSONB that a table rendering one name
//                         has no use for, and every row of a list is shipped
//                         to the browser inside the RSC payload.
//   listFullRows(table) — whole rows, for the publish gate's cross-reference
//                         bundle and the script editor's link pickers.
//   getRow(table, id)   — one whole row, for an edit page.
// The per-table names below stay as typed wrappers so pages read the same.

// === Admin row types ==============================================================
// Generated row types widen CHECK-constrained columns to string; the admin
// forms and DataTable need the literal unions, so every row is narrowed once
// here (logged fallback, never a throw — see narrowColumn in lib/content/db.ts).

type WithStatus<T extends { status: string }> = Omit<T, "status"> & { status: StatusValue };

export type AdminScriptRow = WithStatus<ScriptRow>;
export type AdminObjectionRow = WithStatus<ObjectionRow>;
export type AdminFaqRow = WithStatus<FaqRow>;
export type AdminChangelogRow = WithStatus<ChangelogRow>;
export type AdminContactRow = WithStatus<ContactRow>;
export type AdminSopRow = WithStatus<SopRow>;
export type AdminCompetitorRow = Omit<WithStatus<CompetitorRow>, "threat_level"> & {
  threat_level: Competitor["threatLevel"];
};
export type AdminPackageGroupRow = WithStatus<PackageGroupRow>;
export type AdminPackageRow = WithStatus<PackageRow>;
export type AdminProductRow = Omit<WithStatus<ProductRow>, "line" | "category" | "material"> & {
  line: Product["line"];
  category: Product["category"];
  material: NonNullable<Product["material"]> | null;
};
export type ContentVersionRow = Tables<"content_versions">;

/** Columns every admin list needs whatever the table is: the row's identity,
 * the status toggle, the version the row actions send back for the optimistic
 * concurrency check, and the "updated" columns the table renders. */
interface ListBookkeeping {
  id: string;
  status: string;
  version: number;
  updated_at: string;
  updated_by: string | null;
  sort_order: number;
}

const LIST_BOOKKEEPING_COLUMNS = [
  "id",
  "status",
  "version",
  "updated_at",
  "updated_by",
  "sort_order",
] as const satisfies readonly (keyof ListBookkeeping)[];

type ListContentColumn<T extends DashboardTableName> = Exclude<
  Extract<ListColumnOf<T>, keyof Tables<T>>,
  keyof ListBookkeeping
>;

type AdminListRowRaw<T extends DashboardTableName> = ListBookkeeping & Pick<Tables<T>, ListContentColumn<T>>;

/** What a list page hands to DataTable: the bookkeeping columns plus the
 * registry entry's `listColumns`, and nothing else. */
export type AdminListRow<T extends DashboardTableName> = WithStatus<AdminListRowRaw<T>>;

function withStatus<T extends { id: string; status: string }>(row: T): WithStatus<T> {
  return { ...row, status: narrowColumn(statusSchema, row.status, "draft", "status", row.id) };
}

function toAdminCompetitor(row: CompetitorRow): AdminCompetitorRow {
  return {
    ...withStatus(row),
    threat_level: narrowColumn(
      competitorSchema.shape.threatLevel,
      row.threat_level,
      "Ma'lumot yo'q",
      "threat_level",
      row.id
    ),
  };
}

function toAdminProduct(row: ProductRow): AdminProductRow {
  return {
    ...withStatus(row),
    line: narrowColumn(productSchema.shape.line, row.line, "ppr", "line", row.id),
    category: narrowColumn(productSchema.shape.category, row.category, "aksessuar", "category", row.id),
    material: narrowColumn(productSchema.shape.material.unwrap().nullable(), row.material, null, "material", row.id),
  };
}

// === Generic reads ================================================================
// The table name is a runtime value in all three, so they go through the
// column-agnostic client (lib/supabase/typed.ts) and restate the row shape the
// projection produces with `overrideTypes`. The allow-list that makes that
// safe is the registry's own key set: `T` cannot be anything else.

function dynamicClient() {
  return createClient<DynamicTablesDatabase>();
}

/** The list view's rows: bookkeeping columns + the entry's `listColumns`. */
export async function listRows<T extends DashboardTableName>(table: T): Promise<AdminListRow<T>[]> {
  const entry = CONTENT_REGISTRY[table];
  const columns = [...LIST_BOOKKEEPING_COLUMNS, ...entry.listColumns].join(",");

  let query = dynamicClient().from(table).select(columns);
  for (const order of entry.listOrder ?? DEFAULT_LIST_ORDER) {
    query = query.order(order.column, { ascending: order.ascending });
  }

  const { data, error } = await query.overrideTypes<AdminListRowRaw<T>[], { merge: false }>();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data.map(withStatus);
}

/** Whole rows, ordered like the list. Used where the columns a caller needs
 * are the row itself: the publish gate's cross-reference bundle and the
 * script editor's link pickers, which both map rows through lib/content/db. */
export async function listFullRows<T extends DashboardTableName>(table: T): Promise<Tables<T>[]> {
  const entry = CONTENT_REGISTRY[table];

  let query = dynamicClient().from(table).select("*");
  for (const order of entry.listOrder ?? DEFAULT_LIST_ORDER) {
    query = query.order(order.column, { ascending: order.ascending });
  }

  const { data, error } = await query.overrideTypes<Tables<T>[], { merge: false }>();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

/** One whole row for an edit page, or null when there is no such row.
 * `.limit(1)` rather than `.maybeSingle()` so the overridden row type stays
 * an array, which is the shape the generic `T` resolves cleanly in. */
export async function getRow<T extends DashboardTableName>(table: T, id: string): Promise<Tables<T> | null> {
  const { data, error } = await dynamicClient()
    .from(table)
    .select("*")
    .eq("id", id)
    .limit(1)
    .overrideTypes<Tables<T>[], { merge: false }>();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data[0] ?? null;
}

// === Per-table wrappers ===========================================================
// Same names the pages have always imported; each is the generic read above
// plus this table's column narrowing.

export function listScriptRows(): Promise<AdminListRow<"content_scripts">[]> {
  return listRows("content_scripts");
}

export async function getScriptRow(id: string): Promise<AdminScriptRow | null> {
  const row = await getRow("content_scripts", id);
  return row && withStatus(row);
}

export function listObjectionRows(): Promise<AdminListRow<"content_objections">[]> {
  return listRows("content_objections");
}

export async function getObjectionRow(id: string): Promise<AdminObjectionRow | null> {
  const row = await getRow("content_objections", id);
  return row && withStatus(row);
}

export function listFaqRows(): Promise<AdminListRow<"content_faqs">[]> {
  return listRows("content_faqs");
}

export async function getFaqRow(id: string): Promise<AdminFaqRow | null> {
  const row = await getRow("content_faqs", id);
  return row && withStatus(row);
}

export function listChangelogRows(): Promise<AdminListRow<"content_changelog">[]> {
  return listRows("content_changelog");
}

export async function getChangelogRow(id: string): Promise<AdminChangelogRow | null> {
  const row = await getRow("content_changelog", id);
  return row && withStatus(row);
}

export function listContactRows(): Promise<AdminListRow<"content_contacts">[]> {
  return listRows("content_contacts");
}

export async function getContactRow(id: string): Promise<AdminContactRow | null> {
  const row = await getRow("content_contacts", id);
  return row && withStatus(row);
}

export function listSopRows(): Promise<AdminListRow<"content_sops">[]> {
  return listRows("content_sops");
}

export async function getSopRow(id: string): Promise<AdminSopRow | null> {
  const row = await getRow("content_sops", id);
  return row && withStatus(row);
}

export function listCompetitorRows(): Promise<AdminListRow<"content_competitors">[]> {
  return listRows("content_competitors");
}

export async function getCompetitorRow(id: string): Promise<AdminCompetitorRow | null> {
  const row = await getRow("content_competitors", id);
  return row && toAdminCompetitor(row);
}

export function listPackageGroupRows(): Promise<AdminListRow<"content_package_groups">[]> {
  return listRows("content_package_groups");
}

export async function getPackageGroupRow(id: string): Promise<AdminPackageGroupRow | null> {
  const row = await getRow("content_package_groups", id);
  return row && withStatus(row);
}

export function listPackageRows(): Promise<AdminListRow<"content_packages">[]> {
  return listRows("content_packages");
}

export async function getPackageRow(id: string): Promise<AdminPackageRow | null> {
  const row = await getRow("content_packages", id);
  return row && withStatus(row);
}

export function listProductRows(): Promise<AdminListRow<"content_products">[]> {
  return listRows("content_products");
}

export async function getProductRow(id: string): Promise<AdminProductRow | null> {
  const row = await getRow("content_products", id);
  return row && toAdminProduct(row);
}

/** "Read by n / total operators" for the admin changelog list. Manager-only
 * read, same as lib/dashboard/quality.ts's onboarding table: the
 * "user_state_manager_select_all" policy (0009) is what lets a manager's own
 * session see every operator's `changelog.read` row, and "allowed_users_manager_select_all"
 * (0005) the allow-list. Returns null when the counts cannot be read (for
 * example 0009 is not applied yet) — the list is still worth showing without
 * them, so this logs instead of throwing. */
export async function getChangelogReadCounts(): Promise<ChangelogReadCounts | null> {
  const supabase = createClient();
  const [operatorsRes, statesRes] = await Promise.all([
    supabase.from("allowed_users").select("email").eq("role", "operator"),
    supabase.from("user_state").select("user_email, value").eq("key", changelogReadKey.key),
  ]);
  if (operatorsRes.error || statesRes.error) {
    console.error("[admin] changelog read counts:", operatorsRes.error?.message ?? statesRes.error?.message);
    return null;
  }
  return aggregateChangelogReads(
    operatorsRes.data.map((row) => row.email),
    statesRes.data,
    (value) => {
      const parsed = changelogReadKey.schema.safeParse(value);
      return parsed.success ? parsed.data : null;
    }
  );
}

export type CountableTable =
  | "content_scripts"
  | "content_objections"
  | "content_faqs"
  | "content_competitors"
  | "content_package_groups"
  | "content_packages"
  | "content_products";

/** Tables the admin overview counts. A superset of CountableTable: the
 * changelog, contacts and SOPs have an overview card but take no part in the
 * publish gate's cross-reference sets (AdminContentBundle.publishedIds). */
export type OverviewTable = CountableTable | "content_changelog" | "content_contacts" | "content_sops";

export interface StatusCounts {
  total: number;
  draft: number;
}

/** Row counts for the admin overview — two `head: true` count queries, so no
 * row bodies (scripts carry large stages JSONB) ever leave the database. */
export async function countRowsByStatus(table: OverviewTable): Promise<StatusCounts> {
  const supabase = createClient();
  const [totalRes, draftRes] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }),
    supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  if (totalRes.error) throw new Error(`${table}: ${totalRes.error.message}`);
  if (draftRes.error) throw new Error(`${table}: ${draftRes.error.message}`);
  return { total: totalRes.count ?? 0, draft: draftRes.count ?? 0 };
}

export interface AdminContentBundle {
  /** Unlocalised (raw *Ru twins intact) and including drafts — unlike
   * lib/content/loader.ts's getContentBundle(), which is published-only. */
  bundle: ContentBundle;
  products: Product[];
  /** Ids whose status is "published", per table — ContentBundle itself
   * carries no status, and the publish gate must tell drafts apart. */
  publishedIds: Record<CountableTable, ReadonlySet<string>>;
}

function publishedIdSet(rows: { id: string; status: string }[]): ReadonlySet<string> {
  return new Set(rows.filter((row) => row.status === "published").map((row) => row.id));
}

/** Every content row a manager can see, for the publish gate's cross-reference
 * checks (lib/agents/publish-gate). Session client like the rest of this file,
 * so it only works inside a manager's request — the cron scan never calls it. */
export async function getContentBundleAdmin(): Promise<AdminContentBundle> {
  const [scripts, objections, faqs, competitors, packageGroups, packages, products] = await Promise.all([
    listFullRows("content_scripts"),
    listFullRows("content_objections"),
    listFullRows("content_faqs"),
    listFullRows("content_competitors"),
    listFullRows("content_package_groups"),
    listFullRows("content_packages"),
    listFullRows("content_products"),
  ]);

  return {
    bundle: {
      scripts: scripts.map(rowToScript),
      objections: objections.map(rowToObjection),
      faqs: faqs.map(rowToFaq),
      competitors: competitors.map(rowToCompetitor),
      packageGroups: packageGroups.map((group) =>
        rowToPackageGroup(
          group,
          packages.filter((pkg) => pkg.group_id === group.id)
        )
      ),
    },
    products: products.map(rowToProduct),
    publishedIds: {
      content_scripts: publishedIdSet(scripts),
      content_objections: publishedIdSet(objections),
      content_faqs: publishedIdSet(faqs),
      content_competitors: publishedIdSet(competitors),
      content_package_groups: publishedIdSet(packageGroups),
      content_packages: publishedIdSet(packages),
      content_products: publishedIdSet(products),
    },
  };
}

export async function listVersions(table: string, rowId: string): Promise<ContentVersionRow[]> {
  const { data, error } = await createClient()
    .from("content_versions")
    .select("*")
    .eq("table_name", table)
    .eq("row_id", rowId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`content_versions: ${error.message}`);
  return data;
}

// === Trash ========================================================================
// A deleted row leaves exactly one trace: the snapshot the BEFORE DELETE
// trigger wrote (op = 'delete', 0013_baseline_and_audit_integrity.sql). The
// trash page is that set minus every row that exists again — a row deleted and
// restored is not in the bin any more, and neither is a package whose group was
// deleted and re-created with the same id.

/** One restorable row: the newest delete snapshot for a (table, id) pair. */
export interface TrashEntry {
  versionId: number;
  table: DashboardTableName;
  rowId: string;
  /** The row's own title column at the moment it was deleted, or its id. */
  title: string;
  deletedBy: string | null;
  deletedAt: string;
}

export interface TrashPage {
  entries: TrashEntry[];
  /** Offset of the window that was scanned, and its size — the page links. */
  offset: number;
  pageSize: number;
  /** The scan filled its window, so there may be older snapshots after it. */
  hasMore: boolean;
}

interface DeleteSnapshotRow {
  id: number;
  table_name: string;
  row_id: string;
  snapshot: Json;
  actor: string | null;
  created_at: string;
}

/** Ids of `table` that exist right now, out of the ones asked about. One
 * `in` query per table in the window (at most ten), not one per row. */
async function liveIds(table: DashboardTableName, ids: string[]): Promise<ReadonlySet<string>> {
  const { data, error } = await dynamicClient()
    .from(table)
    .select("id")
    .in("id", ids)
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) throw new Error(`${table}: ${error.message}`);
  return new Set(data.map((row) => row.id));
}

/**
 * Deleted rows that can still be restored, newest first.
 *
 * Paginated with `.range()` over the delete snapshots themselves: a window is
 * read, collapsed to one entry per (table, row) — ordering by `id` descending
 * means the first one seen is the newest — and then the rows that exist again
 * are dropped. A page can therefore come back shorter than `pageSize`;
 * `hasMore` says whether the scan hit the end of the window, which is what the
 * "older" link follows.
 */
export async function listTrash({ offset = 0, pageSize = 25 } = {}): Promise<TrashPage> {
  const { data, error } = await createClient()
    .from("content_versions")
    .select("id,table_name,row_id,snapshot,actor,created_at")
    .eq("op", "delete")
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1)
    .overrideTypes<DeleteSnapshotRow[], { merge: false }>();
  if (error) throw new Error(`content_versions: ${error.message}`);

  const newest = new Map<string, DeleteSnapshotRow>();
  for (const row of data) {
    if (!isContentTable(row.table_name)) continue;
    const key = `${row.table_name}:${row.row_id}`;
    if (!newest.has(key)) newest.set(key, row);
  }

  const candidates = [...newest.values()];
  const byTable = new Map<DashboardTableName, string[]>();
  for (const row of candidates) {
    if (!isContentTable(row.table_name)) continue;
    const ids = byTable.get(row.table_name) ?? [];
    ids.push(row.row_id);
    byTable.set(row.table_name, ids);
  }
  const alive = new Map<DashboardTableName, ReadonlySet<string>>(
    await Promise.all(
      [...byTable].map(async ([table, ids]): Promise<[DashboardTableName, ReadonlySet<string>]> => [
        table,
        await liveIds(table, ids),
      ])
    )
  );

  const entries: TrashEntry[] = [];
  for (const row of candidates) {
    if (!isContentTable(row.table_name)) continue;
    const table = row.table_name;
    if (alive.get(table)?.has(row.row_id)) continue;
    const snapshot = isSnapshotRow(row.snapshot) ? row.snapshot : {};
    entries.push({
      versionId: row.id,
      table,
      rowId: row.row_id,
      // Only the title leaves the server: the snapshot itself can be a
      // script's whole stage tree, and the list renders one line per row.
      title: snapshotText(snapshot, CONTENT_REGISTRY[table].titleColumn) ?? row.row_id,
      deletedBy: row.actor,
      deletedAt: row.created_at,
    });
  }

  return { entries, offset, pageSize, hasMore: data.length === pageSize };
}

// === Allow-list (/admin/users) ======================================================
// public.allowed_users under the admin's read policy (0014/0020), joined in TS
// with admin_user_last_activity() (0017). The two are read side by side and
// the activity is optional: an unapplied 0017 or a failed call leaves the
// "last activity" column empty, not the page.

export interface AdminUserList {
  users: AdminUser[];
  /** False when admin_user_last_activity() could not be read. */
  activityAvailable: boolean;
}

export async function listAdminUsers(): Promise<AdminUserList> {
  const supabase = createClient();
  const [rows, activity] = await Promise.all([
    supabase
      .from("allowed_users")
      .select("email,full_name,role,is_active,updated_at,updated_by")
      .order("email"),
    supabase.rpc("admin_user_last_activity"),
  ]);
  if (rows.error) throw new Error(`allowed_users: ${rows.error.message}`);

  if (activity.error) console.error("[admin] admin_user_last_activity:", activity.error.code, activity.error.message);
  const lastSeen = new Map<string, string | null>(
    (activity.data ?? []).map((row) => [row.member_email, row.last_seen_at])
  );

  const users: AdminUser[] = [];
  for (const row of rows.data) {
    // allowed_users_role_chk was NOT VALID until 0020 validated it: a row
    // with another role cannot exist after it, but if one ever did, the hook
    // would stamp it verbatim — which roleFromClaims() then refuses. Logged,
    // not rendered.
    if (!isUserRole(row.role)) {
      console.error("[admin] allowed_users row with an unknown role skipped");
      continue;
    }
    users.push({
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      lastActivityAt: lastSeen.get(row.email) ?? null,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    });
  }

  return { users, activityAvailable: !activity.error };
}
