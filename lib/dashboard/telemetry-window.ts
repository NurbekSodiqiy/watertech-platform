import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getContentBundleOrEmpty } from "@/lib/content/loader";
import {
  buildEntityLabelMaps,
  TOTAL_ONBOARDING_ITEMS,
  type OperatorSummary,
  type WebVitalSummary,
} from "@/lib/telemetry/aggregate";
import { buildDashboardKpis, type DashboardKpis } from "@/lib/dashboard/kpi";
import { getContentHealth } from "@/lib/dashboard/content-health";
import {
  MOST_VIEWED_LIMIT,
  type MostViewedItem,
  type NotHelpfulGroup,
  type ZeroResultQueryGroup,
} from "@/lib/dashboard/quality";
import { dashboardRangeWindow, previousEqualRange, type DashboardRange } from "@/lib/dashboard/range";
import {
  toHourly,
  toKpiTotals,
  toMostViewed,
  toNotHelpful,
  toOperatorSummaries,
  toWebVitals,
  toZeroResultSearches,
} from "@/lib/dashboard/telemetry-rpc";

// Every dashboard number comes from a 0016 function called with the manager's
// own session (RLS-scoped, SECURITY INVOKER) — no raw telemetry row leaves the
// database, so no PostgREST max-rows cap can cut an aggregate short. The calls
// of one tab run in parallel.

/** One widget's data, or the fact that it could not be loaded. A failure
 * carries nothing on purpose: the database error is logged here and never
 * rendered, and the page shows an explicit error state in the widget's place
 * — never an empty chart that reads as "no activity". */
export type WidgetData<T> = { ok: true; data: T } | { ok: false };

/** Ranked-list lengths. Each is sent as p_limit, so no response can approach
 * PostgREST's max-rows; ranking happens in SQL before the cut. */
const ZERO_RESULT_LIMIT = 100;
const NOT_HELPFUL_LIMIT = 100;

export interface RpcResult<Row> {
  data: Row[] | null;
  error: { message: string; code?: string } | null;
}

export function toWidget<Row, T>(fn: string, result: RpcResult<Row>, map: (rows: Row[]) => T): WidgetData<T> {
  if (result.error || !result.data) {
    console.error(`[dashboard] ${fn} failed:`, result.error?.code ?? "", result.error?.message ?? "no data");
    return { ok: false };
  }
  try {
    return { ok: true, data: map(result.data) };
  } catch (error) {
    console.error(`[dashboard] ${fn} returned rows of an unexpected shape:`, error instanceof Error ? error.message : String(error));
    return { ok: false };
  }
}

interface RpcFilter {
  p_from: string;
  p_to: string;
  p_operator?: string;
}

/** The selected Tashkent-day range as UTC instants, plus the operator filter
 * (left out for "all operators" — the SQL default). */
function rpcFilter(range: DashboardRange): RpcFilter {
  const { startUTC, endUTC } = dashboardRangeWindow(range);
  const filter: RpcFilter = { p_from: startUTC, p_to: endUTC };
  if (range.operatorEmail) filter.p_operator = range.operatorEmail;
  return filter;
}

/** The KPI cards every tab shows. The draft count is not telemetry: it comes
 * from the content-health cache, and a failure there still throws to the
 * route's error boundary, as before. */
export async function fetchDashboardKpis(range: DashboardRange): Promise<WidgetData<DashboardKpis>> {
  const supabase = createClient();
  const { startUTC: previousStartUTC } = dashboardRangeWindow(previousEqualRange(range));

  const [result, health] = await Promise.all([
    supabase.rpc("dashboard_kpis", { ...rpcFilter(range), p_prev_from: previousStartUTC }),
    getContentHealth(),
  ]);

  return toWidget("dashboard_kpis", result, (rows) => {
    const [row] = rows;
    if (!row) throw new Error("no row");
    return buildDashboardKpis(toKpiTotals(row), health.draftsTotal);
  });
}

export interface ActivityTelemetry {
  operators: WidgetData<OperatorSummary[]>;
  hourly: WidgetData<number[]>;
  zeroResultSearches: WidgetData<ZeroResultQueryGroup[]>;
  webVitals: WidgetData<WebVitalSummary[]>;
}

/** Faollik: each section can fail on its own and says so on its own. */
export async function fetchActivityTelemetry(range: DashboardRange): Promise<ActivityTelemetry> {
  const supabase = createClient();
  const filter = rpcFilter(range);

  const [operators, hourly, zeroResultSearches, webVitals, labelMaps] = await Promise.all([
    supabase.rpc("dashboard_operator_activity", filter),
    supabase.rpc("dashboard_hourly", filter),
    supabase.rpc("dashboard_zero_result_searches", { ...filter, p_limit: ZERO_RESULT_LIMIT }),
    supabase.rpc("dashboard_web_vitals", filter),
    // "degrade" mode: this only resolves ids to human labels on a
    // request-time manager render. Unreadable content costs the cards their
    // labels, never the telemetry numbers themselves.
    getContentBundleOrEmpty().then(buildEntityLabelMaps),
  ]);

  return {
    operators: toWidget("dashboard_operator_activity", operators, (rows) =>
      toOperatorSummaries(rows, TOTAL_ONBOARDING_ITEMS, labelMaps)
    ),
    hourly: toWidget("dashboard_hourly", hourly, toHourly),
    zeroResultSearches: toWidget("dashboard_zero_result_searches", zeroResultSearches, toZeroResultSearches),
    webVitals: toWidget("dashboard_web_vitals", webVitals, toWebVitals),
  };
}

export interface QualityTelemetry {
  notHelpful: NotHelpfulGroup[];
  zeroResultQueries: ZeroResultQueryGroup[];
  mostViewed: MostViewedItem[];
}

/** Sifat: QualityPanel renders the three lists as one widget, so one failing
 * call puts the whole panel in its error state. */
export async function fetchQualityTelemetry(range: DashboardRange): Promise<WidgetData<QualityTelemetry>> {
  const supabase = createClient();
  const filter = rpcFilter(range);

  const [notHelpfulResult, zeroResultResult, mostViewedResult, labelMaps] = await Promise.all([
    supabase.rpc("dashboard_not_helpful", { ...filter, p_limit: NOT_HELPFUL_LIMIT }),
    supabase.rpc("dashboard_zero_result_searches", { ...filter, p_limit: ZERO_RESULT_LIMIT }),
    supabase.rpc("dashboard_most_viewed", { ...filter, p_limit: MOST_VIEWED_LIMIT }),
    getContentBundleOrEmpty().then(buildEntityLabelMaps),
  ]);

  const notHelpful = toWidget("dashboard_not_helpful", notHelpfulResult, toNotHelpful);
  const zeroResultQueries = toWidget("dashboard_zero_result_searches", zeroResultResult, toZeroResultSearches);
  const mostViewed = toWidget("dashboard_most_viewed", mostViewedResult, (rows) => toMostViewed(rows, labelMaps));

  if (!notHelpful.ok || !zeroResultQueries.ok || !mostViewed.ok) return { ok: false };
  return {
    ok: true,
    data: { notHelpful: notHelpful.data, zeroResultQueries: zeroResultQueries.data, mostViewed: mostViewed.data },
  };
}
