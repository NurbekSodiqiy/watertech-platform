import "server-only";
import { z } from "zod";
import type { DashboardTableName } from "@/lib/dashboard/content-health";
import type { ContentKind } from "@/lib/content/revalidate";
import type { GateResult, GateTarget } from "@/lib/agents/publish-gate/types";
import {
  AdminActionError,
  actionErrorResult,
  actionFailed,
  actionOk,
  gateBlockedResult,
  logDbError,
  referenceInUseResult,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  type ActionResult,
} from "@/lib/admin/errors";
import { adminErrorMap } from "@/lib/admin/validation";
import type { Json } from "@/lib/supabase/database.types";
import {
  CONTENT_REGISTRY,
  gateTargetFor,
  type AdminDbClient,
  type ContentColumn,
  type ContentEntry,
  type ContentRow,
  type ContentWrite,
} from "@/lib/admin/registry";
import { contentColumns, type SnapshotRow } from "@/lib/admin/snapshot";
import { idSchema, statusSchema } from "@/lib/admin/schemas";
import { updateWithVersion } from "./concurrency";
import type { AdminSession } from "./guard";
import type { StatusValue } from "./status";

// The create/update/delete/publish body every content table used to carry its
// own copy of (lib/admin/actions/*.ts were identical apart from a table name,
// a schema and a mapper). Everything table-specific comes from the registry
// entry; everything request-specific comes from `deps`, which is also what
// lets tests/unit/admin/factory.test.ts drive the real supabase-js query
// builder over a mocked fetch instead of a hand-written double.
//
// Not a "use server" file: it exports helper objects, not Server Actions. The
// thin "use server" wrappers in lib/admin/actions/*.ts are the export surface
// the pages bind to.

export interface ContentActionDeps {
  /** Throws (AdminActionError "unauthorized") unless the caller is an admin. */
  requireSession: () => Promise<AdminSession>;
  /** RLS-scoped session client — never the service role, for any content write. */
  client: () => AdminDbClient;
  /** Gates a stored row before its status flips to "published". */
  runGate: (args: { table: DashboardTableName; id: string; actor: string }) => Promise<GateResult>;
  /** Gates the values a save is about to write, so a form cannot publish around the gate. */
  runGateOnCandidate: (args: { target: GateTarget; actor: string }) => Promise<GateResult>;
  revalidate: (kind: ContentKind) => void;
}

export interface RemoveOptions {
  /** The manager has seen the cascade warning (the packages a group takes
   * with it) and asked for the delete anyway. Never set for a `block`
   * reference: those have no confirmation, only "fix the other rows first"
   * or "unpublish this one". */
  confirmCascade?: boolean;
}

export interface ContentActions {
  /** Create when the payload carries no version, update when it does — what
   * an edit form submits, from /admin/<x>/new or /admin/<x>/<id>. */
  save: (input: unknown) => Promise<ActionResult>;
  create: (input: unknown) => Promise<ActionResult>;
  update: (input: unknown) => Promise<ActionResult>;
  remove: (id: string, expectedVersion: number, options?: RemoveOptions) => Promise<ActionResult>;
  setStatus: (id: string, status: StatusValue, expectedVersion: number) => Promise<ActionResult>;
  /** Re-inserts a deleted row from its content_versions snapshot, always as a
   * draft (/admin/trash). Takes the create path below — same sort_order
   * placement, same id_taken guard — but no write schema: a snapshot is a row
   * this database wrote itself, in this table's own column shape, not a form
   * payload. What it may not do is come back published, which is why `status`
   * is forced here and not read from the snapshot. */
  restoreDeleted: (snapshot: SnapshotRow) => Promise<ActionResult>;
}

type DynamicRow = { [column: string]: Json | undefined };

const rowRefSchema = z.object({
  id: idSchema,
  expectedVersion: z.number().int().nonnegative(),
});

const statusChangeSchema = rowRefSchema.extend({ status: statusSchema });

interface PreparedWrite<T extends DashboardTableName, TWrite extends ContentWrite> {
  parsed: TWrite;
  row: ContentRow<T>;
}

/** `sort_order` for a row being appended: one past the last row of its scope
 * (a package's group, or the whole table). Read through the same session
 * client as the insert, so a table a manager cannot see cannot be probed for
 * its size either. */
async function nextSortOrder(
  supabase: AdminDbClient,
  table: string,
  scope: { column: string; value: string } | null
): Promise<number> {
  const selection = supabase.from(table).select("sort_order");
  const scoped = scope ? selection.eq(scope.column, scope.value) : selection;
  const { data, error } = await scoped
    .order("sort_order", { ascending: false })
    .limit(1)
    .overrideTypes<{ sort_order: number | null }[], { merge: false }>();
  if (error) {
    logDbError(`${table} sort_order`, error);
    throw new Error(error.message);
  }
  const top = data[0]?.sort_order;
  return typeof top === "number" ? top + 1 : 0;
}

export function contentActions<
  T extends DashboardTableName,
  TWrite extends ContentWrite,
  TColumns extends readonly ContentColumn<T>[],
>(entry: ContentEntry<T, TWrite, TColumns>, deps: ContentActionDeps): ContentActions {
  const { table, kind } = entry;

  async function prepare(input: unknown, supabase: AdminDbClient): Promise<PreparedWrite<T, TWrite>> {
    const parsed = entry.writeSchema.parse(input, { errorMap: adminErrorMap });
    if (entry.referenceCheck) {
      const issue = await entry.referenceCheck(parsed, supabase);
      if (issue) throw new AdminActionError("validation", issue.field, issue.details);
    }
    return { parsed, row: entry.toRow(parsed) };
  }

  /** Gates the candidate row when the manager is saving it as published.
   * Unchanged in semantics from the per-table actions this replaced: only a
   * move to "published" runs the gate, and a blocked gate writes nothing. */
  async function gateCandidate(row: ContentRow<T>, status: StatusValue, actor: string): Promise<GateResult | null> {
    if (status !== "published") return null;
    const gate = await deps.runGateOnCandidate({ target: gateTargetFor(table, row), actor });
    return gate.passed ? null : gate;
  }

  /** Where the row's `sort_order` is counted from: its own scope (a package's
   * group) or the whole table. Read off the row being written, so a create
   * and a restore-from-trash place a row the same way. */
  function sortScopeOf(payload: DynamicRow): { column: string; value: string } | null {
    const column = entry.sortScopeColumn;
    if (!column) return null;
    const value = payload[column];
    return typeof value === "string" ? { column, value } : null;
  }

  /** The insert both create() and restoreDeleted() end in: place the row at
   * the end of its scope, stamp the actor, and let a taken id fail as
   * id_taken. `.insert()`, not `.upsert()`: an id that already exists belongs
   * to a live row some other manager owns, and silently overwriting it is
   * exactly what the version check on the update path exists to prevent. */
  async function insertRow(
    supabase: AdminDbClient,
    row: ContentRow<T> | SnapshotRow,
    status: StatusValue,
    actor: string
  ): Promise<ActionResult> {
    const payload: DynamicRow = { ...row, status, updated_by: actor };
    payload.sort_order = await nextSortOrder(supabase, table, sortScopeOf(payload));

    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      logDbError(`${table} insert`, error);
      if (error.code === PG_UNIQUE_VIOLATION) return actionFailed("id_taken", { field: "id" });
      return actionFailed("unknown");
    }

    deps.revalidate(kind);
    return actionOk();
  }

  async function create(input: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const supabase = deps.client();
      const { parsed, row } = await prepare(input, supabase);

      const blocked = await gateCandidate(row, parsed.status, session.email);
      if (blocked) return gateBlockedResult(blocked);

      return await insertRow(supabase, row, parsed.status, session.email);
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  async function restoreDeleted(snapshot: SnapshotRow): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const id = snapshot.id;
      if (typeof id !== "string") return actionFailed("validation", { field: "snapshot" });

      // Content columns plus the id; status is "draft" whatever the snapshot
      // said, so a row that was published when it was deleted comes back
      // invisible to operators and goes through the publish gate again.
      const row: DynamicRow = { ...contentColumns(snapshot), id };
      return await insertRow(deps.client(), row, "draft", session.email);
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  async function update(input: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const supabase = deps.client();
      const { parsed, row } = await prepare(input, supabase);
      if (parsed.version === undefined) return actionFailed("validation", { field: "version" });

      const blocked = await gateCandidate(row, parsed.status, session.email);
      if (blocked) return gateBlockedResult(blocked);

      const patch: DynamicRow = { ...row, status: parsed.status, updated_by: session.email };
      await updateWithVersion(supabase, table, parsed.id, patch, parsed.version);

      deps.revalidate(kind);
      return actionOk();
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  async function save(input: unknown): Promise<ActionResult> {
    // Cheap pre-read of the one field that decides the path. The chosen
    // branch re-parses the whole payload, so nothing is trusted from here.
    const version = versionOf(input);
    return version === undefined ? create(input) : update(input);
  }

  async function remove(id: string, expectedVersion: number, options?: RemoveOptions): Promise<ActionResult> {
    try {
      await deps.requireSession();
      const ref = rowRefSchema.parse({ id, expectedVersion }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      // What still points at this row. A `block` use is a dangling id waiting
      // to happen (an objection id inside a script's stage tree, a script id
      // inside an objection's script_ids — neither has a foreign key), so the
      // delete is refused and the dialog offers unpublishing instead. A
      // `cascade` use is rows the database removes with this one, which the
      // manager confirms once, by name and count.
      if (entry.referencedBy) {
        const uses = await entry.referencedBy(ref.id, supabase);
        const blocking = uses.filter((use) => use.mode === "block");
        if (blocking.length > 0) return referenceInUseResult(blocking);
        const cascading = uses.filter((use) => use.mode === "cascade");
        if (cascading.length > 0 && !options?.confirmCascade) return referenceInUseResult(cascading);
      }

      // Version-guarded like every other write: /admin/trash can bring the row
      // back as a draft, but not the edit someone made in the meantime, so the
      // delete must not land on a row that changed after the manager last
      // looked at it.
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq("id", ref.id)
        .eq("version", ref.expectedVersion)
        .select("id")
        .overrideTypes<{ id: string }[], { merge: false }>();
      if (error) {
        logDbError(`${table} delete`, error);
        if (error.code === PG_FOREIGN_KEY_VIOLATION) return actionFailed("reference_in_use");
        return actionFailed("unknown");
      }
      if (data.length === 0) {
        return actionFailed((await rowExists(supabase, table, ref.id)) ? "version_conflict" : "not_found");
      }

      deps.revalidate(kind);
      return actionOk();
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  async function setStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const change = statusChangeSchema.parse({ id, status, expectedVersion }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      // Unpublishing never runs the gate — only a move to "published" does.
      if (change.status === "published") {
        const gate = await deps.runGate({ table, id: change.id, actor: session.email });
        if (!gate.passed) return gateBlockedResult(gate);
      }

      await updateWithVersion(
        supabase,
        table,
        change.id,
        { status: change.status, updated_by: session.email },
        change.expectedVersion
      );

      deps.revalidate(kind);
      return actionOk();
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  return { save, create, update, remove, setStatus, restoreDeleted };
}

/** `contentActions` for a table whose name is only known at runtime — the
 * trash page restores whatever table the snapshot came from. Written out per
 * table for the same reason GATE_TARGETS in lib/admin/registry.ts is:
 * `CONTENT_REGISTRY[table]` for a union `table` is a union of entries, and
 * TypeScript cannot prove one inhabits `ContentEntry<T, TWrite, TColumns>`
 * with its three parameters correlated. */
const CONTENT_ACTIONS: {
  [T in DashboardTableName]: (deps: ContentActionDeps) => ContentActions;
} = {
  content_scripts: (deps) => contentActions(CONTENT_REGISTRY.content_scripts, deps),
  content_objections: (deps) => contentActions(CONTENT_REGISTRY.content_objections, deps),
  content_faqs: (deps) => contentActions(CONTENT_REGISTRY.content_faqs, deps),
  content_competitors: (deps) => contentActions(CONTENT_REGISTRY.content_competitors, deps),
  content_package_groups: (deps) => contentActions(CONTENT_REGISTRY.content_package_groups, deps),
  content_packages: (deps) => contentActions(CONTENT_REGISTRY.content_packages, deps),
  content_products: (deps) => contentActions(CONTENT_REGISTRY.content_products, deps),
  content_changelog: (deps) => contentActions(CONTENT_REGISTRY.content_changelog, deps),
  content_contacts: (deps) => contentActions(CONTENT_REGISTRY.content_contacts, deps),
  content_sops: (deps) => contentActions(CONTENT_REGISTRY.content_sops, deps),
};

export function contentActionsFor(table: DashboardTableName, deps: ContentActionDeps): ContentActions {
  return CONTENT_ACTIONS[table](deps);
}

async function rowExists(supabase: AdminDbClient, table: string, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();
  if (error) {
    logDbError(`${table} exists`, error);
    return false;
  }
  return data !== null;
}

/** `version` off an unvalidated payload, only to choose insert vs update. */
function versionOf(input: unknown): number | undefined {
  if (typeof input !== "object" || input === null || !("version" in input)) return undefined;
  const value = input.version;
  return typeof value === "number" ? value : undefined;
}
