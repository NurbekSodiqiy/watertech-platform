import type { ZodType, ZodTypeDef } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DynamicTablesDatabase, Tables } from "@/lib/supabase/typed";
import type { DashboardTableName } from "@/lib/dashboard/content-health";
import type { ContentKind } from "@/lib/content/revalidate";
import type { GateTarget } from "@/lib/agents/publish-gate/types";
import type { StatusValue } from "@/lib/admin/actions/status";
import { stagesSchema } from "@/lib/content/schemas";
import {
  changelogToRow,
  chain,
  competitorToRow,
  contactToRow,
  faqToRow,
  objectionToRow,
  packageGroupToRow,
  packageToRow,
  productToRow,
  scriptToRow,
  sopToRow,
} from "@/lib/content/db";
import {
  changelogWriteSchema,
  competitorWriteSchema,
  contactWriteSchema,
  faqWriteSchema,
  objectionWriteSchema,
  packageGroupWriteSchema,
  packageWriteSchema,
  productWriteSchema,
  scriptWriteSchema,
  sopWriteSchema,
} from "@/lib/admin/schemas";
import type { Script } from "@/lib/content/types";

// One description per content table, in one place. Before this file the same
// ten facts (which zod schema validates a write, which mapper turns it into a
// row, which cache tag to clear, where the editor lives) were spelled out
// again in every lib/admin/actions/*.ts, in lib/admin/queries.ts and in the
// publish gate. The action factory (lib/admin/actions/factory.ts), the generic
// queries and the gate's row loader all read them from here instead, so a new
// content module is an entry plus its pages — see docs/ADDING_A_MODULE.md.

/** Columns the database and the factory maintain, never a *ToRow mapper. */
type BookkeepingColumn = "status" | "sort_order" | "version" | "created_at" | "updated_at" | "updated_by";

/** What a `*ToRow` mapper in lib/content/db.ts produces: the table's own
 * content columns and nothing else. Identical to the row shape the publish
 * gate checks (lib/agents/publish-gate/types.ts), which is what lets a save
 * gate the values it is about to write. */
export type ContentRow<T extends DashboardTableName> = Omit<Tables<T>, BookkeepingColumn>;

export type ContentColumn<T extends DashboardTableName> = keyof Tables<T> & string;

/** Every `*WriteSchema` in lib/admin/schemas.ts parses to at least this: a
 * slug id, a status, and the row version the editor loaded (absent when the
 * manager is creating). */
export interface ContentWrite {
  id: string;
  status: StatusValue;
  version?: number;
}

/** The column-agnostic client (lib/supabase/typed.ts) — the table name is a
 * runtime value in every generic path here, and the allow-list that makes
 * that safe is this registry's own key set. Always an RLS-scoped session
 * client for writes, never the service role (CLAUDE.md §7). */
export type AdminDbClient = SupabaseClient<DynamicTablesDatabase>;

/** A cross-reference a write would break: which input field, and the ids that
 * do not resolve. Reported as `{ code: "validation", field, details }`. */
export interface ReferenceIssue {
  field: string;
  details: string[];
}

/** Rows in another table that point at this one. Read by the delete guard in
 * S07; nothing in S06 calls it. */
export interface ReferenceUse {
  table: DashboardTableName;
  ids: string[];
}

export interface ListOrder {
  column: string;
  ascending: boolean;
}

/** Lists are ordered by `sort_order` unless the entry says otherwise. */
export const DEFAULT_LIST_ORDER: readonly ListOrder[] = [{ column: "sort_order", ascending: true }];

export interface ContentEntry<
  T extends DashboardTableName,
  TWrite extends ContentWrite,
  TColumns extends readonly ContentColumn<T>[],
> {
  readonly table: T;
  /** Cache tag cleared after a write (`revalidateContent(kind)`). */
  readonly kind: ContentKind;
  /** Editor base path; `${adminPath}/${id}` is the row's edit page. */
  readonly adminPath: string;
  readonly writeSchema: ZodType<TWrite, ZodTypeDef, unknown>;
  readonly toRow: (parsed: TWrite) => ContentRow<T>;
  /** Content columns the list view shows, on top of the bookkeeping columns
   * every list selects. The projection is the point: `select("*")` on
   * content_scripts ships both stage trees to the browser for a table that
   * renders one name. */
  readonly listColumns: TColumns;
  /** Column that names a row in a notification, a gate report or a log line. */
  readonly titleColumn: ContentColumn<T>;
  readonly listOrder?: readonly ListOrder[];
  /** New rows are appended after the last row of the same scope — packages
   * are ordered inside their group, everything else table-wide. */
  readonly sortScope?: (parsed: TWrite) => { column: ContentColumn<T>; value: string };
  /** Ids this row points at that have no foreign key to enforce them. */
  readonly referenceCheck?: (parsed: TWrite, supabase: AdminDbClient) => Promise<ReferenceIssue | null>;
  /** Rows elsewhere that point at this one (S07's delete guard). */
  readonly referencedBy?: (id: string, supabase: AdminDbClient) => Promise<ReferenceUse[]>;
}

/** Identity function that pins one entry's three type parameters, so
 * `toRow`, `sortScope` and `referenceCheck` are checked against the schema's
 * own parsed type and `listColumns` keeps its literal member types. */
function defineEntry<
  T extends DashboardTableName,
  TWrite extends ContentWrite,
  const TColumns extends readonly ContentColumn<T>[],
>(entry: ContentEntry<T, TWrite, TColumns>): ContentEntry<T, TWrite, TColumns> {
  return entry;
}

/** The part of an entry that does not depend on its parsed write type — what
 * the `satisfies` below checks, and all the generic list/read paths need. */
interface ContentEntryShape<T extends DashboardTableName> {
  table: T;
  kind: ContentKind;
  adminPath: string;
  listColumns: readonly ContentColumn<T>[];
  titleColumn: ContentColumn<T>;
  listOrder?: readonly ListOrder[];
}

async function objectionIdsInUse(supabase: AdminDbClient, objectionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("content_scripts")
    .select("id,stages,stages_ru")
    .overrideTypes<{ id: string; stages: unknown; stages_ru: unknown }[], { merge: false }>();
  if (error) throw new Error(error.message);
  return data
    .filter((row) =>
      [row.stages, row.stages_ru].some((value) => {
        const parsed = stagesSchema.safeParse(value);
        return parsed.success && parsed.data.some((stage) => stage.objectionIds.includes(objectionId));
      })
    )
    .map((row) => row.id);
}

export const CONTENT_REGISTRY = {
  content_scripts: defineEntry({
    table: "content_scripts",
    kind: "scripts",
    adminPath: "/admin/scripts",
    writeSchema: scriptWriteSchema,
    // The editor sends stages in order; `chain` is what fills each stage's
    // nextStageId, and an empty stagesRu means "no Russian script", not "a
    // script with no stages".
    toRow: (parsed) => {
      const script: Script = {
        id: parsed.id,
        name: parsed.name,
        cheatSheet: parsed.cheatSheet,
        stages: chain(parsed.stages),
        nameRu: parsed.nameRu,
        cheatSheetRu: parsed.cheatSheetRu,
        stagesRu: parsed.stagesRu && parsed.stagesRu.length > 0 ? chain(parsed.stagesRu) : undefined,
      };
      return scriptToRow(script);
    },
    listColumns: ["name"],
    titleColumn: "name",
    // objectionIds reference content_objections by id with no DB-level FK
    // (see lib/content/types.ts) — checked against every objection a manager
    // could see, draft or published, not the published-only getObjections().
    referenceCheck: async (parsed, supabase) => {
      const { data, error } = await supabase
        .from("content_objections")
        .select("id")
        .overrideTypes<{ id: string }[], { merge: false }>();
      if (error) throw new Error(error.message);
      const known = new Set(data.map((row) => row.id));
      const unknown = [
        ...new Set(
          [...parsed.stages, ...(parsed.stagesRu ?? [])].flatMap((stage) =>
            stage.objectionIds.filter((id) => !known.has(id))
          )
        ),
      ];
      return unknown.length > 0 ? { field: "stages", details: unknown } : null;
    },
  }),

  content_objections: defineEntry({
    table: "content_objections",
    kind: "objections",
    adminPath: "/admin/objections",
    writeSchema: objectionWriteSchema,
    toRow: objectionToRow,
    listColumns: ["label"],
    titleColumn: "label",
    referencedBy: async (id, supabase) => {
      const ids = await objectionIdsInUse(supabase, id);
      return ids.length > 0 ? [{ table: "content_scripts", ids }] : [];
    },
  }),

  content_faqs: defineEntry({
    table: "content_faqs",
    kind: "faqs",
    adminPath: "/admin/faq",
    writeSchema: faqWriteSchema,
    toRow: faqToRow,
    listColumns: ["question", "category"],
    titleColumn: "question",
  }),

  content_competitors: defineEntry({
    table: "content_competitors",
    kind: "competitors",
    adminPath: "/admin/competitors",
    writeSchema: competitorWriteSchema,
    toRow: competitorToRow,
    listColumns: ["name", "threat_level"],
    titleColumn: "name",
  }),

  content_package_groups: defineEntry({
    table: "content_package_groups",
    kind: "packages",
    adminPath: "/admin/packages/groups",
    writeSchema: packageGroupWriteSchema,
    toRow: packageGroupToRow,
    listColumns: ["title", "subtitle"],
    titleColumn: "title",
    referencedBy: async (id, supabase) => {
      const { data, error } = await supabase
        .from("content_packages")
        .select("id")
        .eq("group_id", id)
        .overrideTypes<{ id: string }[], { merge: false }>();
      if (error) throw new Error(error.message);
      return data.length > 0 ? [{ table: "content_packages", ids: data.map((row) => row.id) }] : [];
    },
  }),

  content_packages: defineEntry({
    table: "content_packages",
    kind: "packages",
    adminPath: "/admin/packages",
    writeSchema: packageWriteSchema,
    toRow: (parsed) => packageToRow(parsed, parsed.groupId),
    listColumns: ["name", "group_id", "estimated_discount"],
    titleColumn: "name",
    // A package's order is its position inside its group, so a new one goes
    // after the last package of that group, not after the whole table.
    sortScope: (parsed) => ({ column: "group_id", value: parsed.groupId }),
  }),

  content_products: defineEntry({
    table: "content_products",
    kind: "products",
    adminPath: "/admin/products",
    writeSchema: productWriteSchema,
    toRow: productToRow,
    listColumns: ["name_ru", "line", "category"],
    titleColumn: "name_ru",
  }),

  content_changelog: defineEntry({
    table: "content_changelog",
    kind: "changelog",
    adminPath: "/admin/changelog",
    writeSchema: changelogWriteSchema,
    toRow: changelogToRow,
    listColumns: ["title", "published_on", "approved_by"],
    titleColumn: "title",
    // Newest first, like the operator page — drafts included.
    listOrder: [
      { column: "published_on", ascending: false },
      { column: "sort_order", ascending: true },
    ],
  }),

  content_contacts: defineEntry({
    table: "content_contacts",
    kind: "contacts",
    adminPath: "/admin/contacts",
    writeSchema: contactWriteSchema,
    toRow: contactToRow,
    listColumns: ["name", "role", "topic", "phone"],
    titleColumn: "name",
  }),

  content_sops: defineEntry({
    table: "content_sops",
    kind: "sops",
    adminPath: "/admin/sops",
    writeSchema: sopWriteSchema,
    toRow: sopToRow,
    // `steps` is in the projection because the list shows a step count; it is
    // a handful of short strings per row, unlike a script's stage tree.
    listColumns: ["title", "summary", "steps"],
    titleColumn: "title",
  }),
} satisfies { [T in DashboardTableName]: ContentEntryShape<T> };

export type ContentRegistry = typeof CONTENT_REGISTRY;

/** Content columns the list view of `T` selects. */
export type ListColumnOf<T extends DashboardTableName> = ContentRegistry[T]["listColumns"][number];

/** Pairs a table with the row its mapper produced, as the publish gate's
 * discriminated union. TypeScript cannot prove `{ table: T; row: ContentRow<T> }`
 * inhabits that union for a generic `T` (the two type parameters are
 * correlated), so the pairing is written out once per table here and every
 * generic caller — the action factory, the gate's row loader — goes through
 * `gateTargetFor`. */
const GATE_TARGETS: { [T in DashboardTableName]: (row: ContentRow<T>) => GateTarget } = {
  content_scripts: (row) => ({ table: "content_scripts", row }),
  content_objections: (row) => ({ table: "content_objections", row }),
  content_faqs: (row) => ({ table: "content_faqs", row }),
  content_competitors: (row) => ({ table: "content_competitors", row }),
  content_package_groups: (row) => ({ table: "content_package_groups", row }),
  content_packages: (row) => ({ table: "content_packages", row }),
  content_products: (row) => ({ table: "content_products", row }),
  content_changelog: (row) => ({ table: "content_changelog", row }),
  content_contacts: (row) => ({ table: "content_contacts", row }),
  content_sops: (row) => ({ table: "content_sops", row }),
};

export function gateTargetFor<T extends DashboardTableName>(table: T, row: ContentRow<T>): GateTarget {
  return GATE_TARGETS[table](row);
}

export function isContentTable(table: string): table is DashboardTableName {
  return Object.prototype.hasOwnProperty.call(CONTENT_REGISTRY, table);
}
