import type {
  ScriptRow,
  ObjectionRow,
  FaqRow,
  CompetitorRow,
  PackageGroupRow,
  PackageRow,
  ProductRow,
} from "@/lib/content/db";
import type { AdminContentBundle } from "@/lib/admin/queries";
import type { DashboardTableName } from "@/lib/dashboard/content-health";

export interface GateIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  /** Column (or JSON path inside one, e.g. `stages[0].turns`) the issue is
   * about — rendered as a chip in GateReport. */
  field?: string;
}

/** `passed` is true when no issue has `error` severity — warnings never block. */
export interface GateResult {
  passed: boolean;
  issues: GateIssue[];
}

export type GateTable = DashboardTableName;

/** Bookkeeping columns no check reads. Leaving them out means a gate target
 * is exactly what lib/content/db.ts's *ToRow mappers return, so an upsert
 * can gate the row it is about to write, and a test fixture needs only the
 * content columns. A full DB row still satisfies it. */
type BookkeepingColumn = "status" | "sort_order" | "version" | "updated_at" | "updated_by" | "created_at";
type ContentColumns<Row> = Omit<Row, BookkeepingColumn>;

export type GateTarget =
  | { table: "content_scripts"; row: ContentColumns<ScriptRow> }
  | { table: "content_objections"; row: ContentColumns<ObjectionRow> }
  | { table: "content_faqs"; row: ContentColumns<FaqRow> }
  | { table: "content_competitors"; row: ContentColumns<CompetitorRow> }
  | { table: "content_package_groups"; row: ContentColumns<PackageGroupRow> }
  | { table: "content_packages"; row: ContentColumns<PackageRow> }
  | { table: "content_products"; row: ContentColumns<ProductRow> };

/** Everything a check may look at besides the row itself: the unlocalised
 * bundle (drafts included), products, and which ids are published per table
 * (ContentBundle carries no status). Built by getContentBundleAdmin(). */
export type GateContext = AdminContentBundle;

export type GateCheck = (target: GateTarget, ctx: GateContext) => GateIssue[];
