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
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  type ActionResult,
} from "@/lib/admin/errors";
import { adminErrorMap } from "@/lib/admin/validation";
import type { Json } from "@/lib/supabase/database.types";
import {
  gateTargetFor,
  type AdminDbClient,
  type ContentColumn,
  type ContentEntry,
  type ContentRow,
  type ContentWrite,
} from "@/lib/admin/registry";
import { idSchema, statusSchema } from "@/lib/admin/schemas";
import { updateWithVersion } from "./concurrency";
import type { ManagerSession } from "./guard";
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
  /** Throws (AdminActionError "unauthorized") unless the caller is a manager. */
  requireSession: () => Promise<ManagerSession>;
  /** RLS-scoped session client — never the service role, for any content write. */
  client: () => AdminDbClient;
  /** Gates a stored row before its status flips to "published". */
  runGate: (args: { table: DashboardTableName; id: string; actor: string }) => Promise<GateResult>;
  /** Gates the values a save is about to write, so a form cannot publish around the gate. */
  runGateOnCandidate: (args: { target: GateTarget; actor: string }) => Promise<GateResult>;
  revalidate: (kind: ContentKind) => void;
}

export interface ContentActions {
  /** Create when the payload carries no version, update when it does — what
   * an edit form submits, from /admin/<x>/new or /admin/<x>/<id>. */
  save: (input: unknown) => Promise<ActionResult>;
  create: (input: unknown) => Promise<ActionResult>;
  update: (input: unknown) => Promise<ActionResult>;
  remove: (id: string, expectedVersion: number) => Promise<ActionResult>;
  setStatus: (id: string, status: StatusValue, expectedVersion: number) => Promise<ActionResult>;
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

  async function create(input: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const supabase = deps.client();
      const { parsed, row } = await prepare(input, supabase);

      const blocked = await gateCandidate(row, parsed.status, session.email);
      if (blocked) return gateBlockedResult(blocked);

      const scope = entry.sortScope ? entry.sortScope(parsed) : null;
      const sortOrder = await nextSortOrder(supabase, table, scope);

      // .insert(), not .upsert(): an id that already exists belongs to a live
      // row some other manager owns, and silently overwriting it is exactly
      // what the version check on the update path exists to prevent.
      const payload: DynamicRow = {
        ...row,
        status: parsed.status,
        sort_order: sortOrder,
        updated_by: session.email,
      };
      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        logDbError(`${table} insert`, error);
        if (error.code === PG_UNIQUE_VIOLATION) return actionFailed("id_taken", { field: "id" });
        return actionFailed("unknown");
      }

      deps.revalidate(kind);
      return actionOk();
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

  async function remove(id: string, expectedVersion: number): Promise<ActionResult> {
    try {
      await deps.requireSession();
      const ref = rowRefSchema.parse({ id, expectedVersion }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      // Version-guarded like every other write: a delete is the one edit that
      // cannot be undone from the UI, so it must not land on a row that
      // changed after the manager last looked at it.
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

  return { save, create, update, remove, setStatus };
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
