import "server-only";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { TELEMETRY_EVENT_TYPES } from "@/lib/telemetry/types";
import {
  checklistPercent,
  resolveAdminHref,
  resolveEntityLabel,
  type EntityLabelMaps,
  type OperatorSummary,
  type WebVitalSummary,
} from "@/lib/telemetry/aggregate";
import type { DashboardKpiTotals } from "@/lib/dashboard/kpi";
import type { MostViewedItem, NotHelpfulGroup, ZeroResultQueryGroup } from "@/lib/dashboard/quality";

// Rows of the 0016 dashboard functions, turned into exactly the shapes the
// dashboard components already take (the same ones the TS reference
// aggregators produce). Pure, so tests/unit/dashboard/parity.test.ts can run
// the expected rows of supabase/tests/dashboard-parity.sql through them.
//
// Order is never touched here: every function returns its rows already ranked,
// and re-sorting in JS would only risk disagreeing with the SQL tie-break.
// Labels and admin links are resolved here because they need the content
// bundle, which the database functions do not read.

type DashboardFunctions = Database["public"]["Functions"];
type RpcRow<Name extends keyof DashboardFunctions> = DashboardFunctions[Name]["Returns"] extends (infer Row)[]
  ? Row
  : never;

export type KpiTotalsRow = RpcRow<"dashboard_kpis">;
export type OperatorActivityRow = RpcRow<"dashboard_operator_activity">;
export type HourlyRow = RpcRow<"dashboard_hourly">;
export type ZeroResultSearchRow = RpcRow<"dashboard_zero_result_searches">;
export type WebVitalRow = RpcRow<"dashboard_web_vitals">;
export type NotHelpfulRow = RpcRow<"dashboard_not_helpful">;
export type MostViewedRow = RpcRow<"dashboard_most_viewed">;

const eventTypeSchema = z.enum(TELEMETRY_EVENT_TYPES);

/** top_viewed is jsonb built by dashboard_operator_activity — typed `Json` by
 * the client, so it is checked here before anything reads it. */
const topViewedSchema = z.array(
  z.object({
    view_type: eventTypeSchema,
    entity_id: z.string().nullable(),
    path: z.string(),
    view_count: z.number().int().nonnegative(),
  })
);

export function toKpiTotals(row: KpiTotalsRow): DashboardKpiTotals {
  return {
    current: {
      activeOperators: row.active_operators,
      activeMs: row.active_ms,
      zeroResultSearches: row.zero_result_searches,
    },
    previous: {
      activeOperators: row.active_operators_prev,
      activeMs: row.active_ms_prev,
      zeroResultSearches: row.zero_result_searches_prev,
    },
  };
}

/** Throws on a malformed top_viewed — the caller turns that into the widget's
 * error state rather than a card with a silently empty list. */
export function toOperatorSummaries(
  rows: OperatorActivityRow[],
  checklistTotal: number,
  maps: EntityLabelMaps
): OperatorSummary[] {
  return rows.map((row) => ({
    email: row.operator_email,
    activeMs: row.active_ms,
    topViewed: topViewedSchema.parse(row.top_viewed).map((view) => ({
      label: resolveEntityLabel(view.view_type, view.entity_id, view.path, maps),
      count: view.view_count,
      adminHref: resolveAdminHref(view.view_type, view.entity_id),
    })),
    copyCount: row.copy_count,
    checklistCompleted: row.checklist_completed,
    checklistTotal,
    checklistPercent: checklistPercent(row.checklist_completed, checklistTotal),
  }));
}

/** Index = Tashkent hour, like aggregateHourly. Throws unless the function
 * returned each of the 24 hours exactly once. */
export function toHourly(rows: HourlyRow[]): number[] {
  const counts: (number | undefined)[] = new Array(24).fill(undefined);
  for (const row of rows) {
    if (!Number.isInteger(row.hour_of_day) || row.hour_of_day < 0 || row.hour_of_day > 23) {
      throw new Error(`dashboard_hourly returned hour ${row.hour_of_day}`);
    }
    counts[row.hour_of_day] = row.event_count;
  }
  return counts.map((count, hour) => {
    if (count === undefined) throw new Error(`dashboard_hourly returned no row for hour ${hour}`);
    return count;
  });
}

/** Normalizes the timestamp to toISOString() form — PostgREST sends
 * `…+00:00`, the reference kept the stored string. */
export function toZeroResultSearches(rows: ZeroResultSearchRow[]): ZeroResultQueryGroup[] {
  return rows.map((row) => ({
    query: row.search_query,
    count: row.search_count,
    lastSeenIso: new Date(row.last_seen_at).toISOString(),
  }));
}

export function toWebVitals(rows: WebVitalRow[]): WebVitalSummary[] {
  return rows.map((row) => ({ name: row.metric_name, p50: row.p50, p75: row.p75, samples: row.samples }));
}

export function toNotHelpful(rows: NotHelpfulRow[]): NotHelpfulGroup[] {
  return rows.map((row) => ({ path: row.page_path, count: row.feedback_count }));
}

export function toMostViewed(rows: MostViewedRow[], maps: EntityLabelMaps): MostViewedItem[] {
  return rows.map((row) => {
    const type = eventTypeSchema.parse(row.view_type);
    return {
      label: resolveEntityLabel(type, row.view_entity_id, row.view_path, maps),
      count: row.view_count,
      adminHref: resolveAdminHref(type, row.view_entity_id),
    };
  });
}
