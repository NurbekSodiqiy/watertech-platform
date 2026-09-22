import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getContentBundleOrEmpty } from "@/lib/content/loader";
import { buildEntityLabelMaps, type TelemetryRow, type EntityLabelMaps } from "@/lib/telemetry/aggregate";
import { computeDashboardKpis, type DashboardKpis } from "@/lib/dashboard/kpi";
import { dashboardRangeWindow, combinedQueryWindow, type DashboardRange } from "@/lib/dashboard/range";

export interface DashboardTelemetryData {
  /** Rows within the selected range — not yet narrowed by operator, see
   * lib/telemetry/aggregate.ts's filterRows for that. */
  currentRows: TelemetryRow[];
  /** Rows from the equal-length range right before it, same operator scope
   * as currentRows — only used for the KPI deltas already baked into `kpis`. */
  previousRows: TelemetryRow[];
  labelMaps: EntityLabelMaps;
  kpis: DashboardKpis;
  error: string | null;
}

/** Every dashboard tab's one telemetry query per render: a single fetch
 * spanning the previous + current range (see combinedQueryWindow), split
 * back into the two windows here so the caller never issues a second query
 * just to compute the KPI cards' deltas. Only the 9 columns every aggregator
 * in lib/telemetry/aggregate.ts / lib/dashboard/quality.ts actually reads —
 * never `select("*")`, so `created_at` (unused) never leaves the database. */
export async function fetchDashboardTelemetry(range: DashboardRange): Promise<DashboardTelemetryData> {
  const supabase = createClient();
  const currentWindow = dashboardRangeWindow(range);
  const queryWindow = combinedQueryWindow(range);

  const [{ data, error }, labelMaps] = await Promise.all([
    supabase
      .from("telemetry_events")
      .select("id, user_email, session_id, ts, type, path, entity_type, entity_id, duration_ms, meta")
      .gte("ts", queryWindow.startUTC)
      .lt("ts", queryWindow.endUTC),
    // "degrade" mode: this only resolves ids to human labels on a
    // request-time manager render. Unreadable content costs the charts their
    // labels, never the telemetry numbers themselves.
    getContentBundleOrEmpty().then(buildEntityLabelMaps),
  ]);

  const allRows = (data ?? []) as TelemetryRow[];
  const currentRows = allRows.filter((r) => r.ts >= currentWindow.startUTC);
  const previousRows = allRows.filter((r) => r.ts < currentWindow.startUTC);
  const kpis = await computeDashboardKpis(currentRows, previousRows, labelMaps, range.operatorEmail);

  return { currentRows, previousRows, labelMaps, kpis, error: error?.message ?? null };
}
