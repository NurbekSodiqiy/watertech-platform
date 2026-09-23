import "server-only";
import {
  aggregatePerOperator,
  aggregateZeroResultSearches,
  filterRows,
  type TelemetryRow,
  type EntityLabelMaps,
} from "@/lib/telemetry/aggregate";

export interface KpiValue {
  value: number;
  /** Percent change vs. the previous equal-length range, rounded. null means
   * there's nothing to compare against (previous period had 0 and current
   * also has 0), or the metric isn't range-scoped at all (draft count). */
  deltaPercent: number | null;
}

export interface DashboardKpis {
  activeOperators: KpiValue;
  totalActiveMs: KpiValue;
  draftCount: KpiValue;
  zeroResultSearches: KpiValue;
}

/** The telemetry half of the KPI cards for one window. public.dashboard_kpis
 * (0016) returns it for the current and the previous window in one call. */
export interface KpiWindowTotals {
  activeOperators: number;
  activeMs: number;
  zeroResultSearches: number;
}

export interface DashboardKpiTotals {
  current: KpiWindowTotals;
  previous: KpiWindowTotals;
}

function activeOperatorCount(rows: TelemetryRow[]): number {
  return new Set(rows.filter((r) => r.type === "page_enter").map((r) => r.user_email)).size;
}

function totalActiveMs(rows: TelemetryRow[], labelMaps: EntityLabelMaps): number {
  return aggregatePerOperator(rows, 0, labelMaps).reduce((sum, op) => sum + op.activeMs, 0);
}

function totalZeroResultSearches(rows: TelemetryRow[]): number {
  return aggregateZeroResultSearches(rows).reduce((sum, s) => sum + s.count, 0);
}

function windowTotals(rows: TelemetryRow[], labelMaps: EntityLabelMaps): KpiWindowTotals {
  return {
    activeOperators: activeOperatorCount(rows),
    activeMs: totalActiveMs(rows, labelMaps),
    zeroResultSearches: totalZeroResultSearches(rows),
  };
}

function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Reference implementation over raw rows — the dashboard reads the same
 * totals from public.dashboard_kpis, and tests/unit/dashboard/parity.test.ts
 * holds the two to one expected table. current/previousRows must already be
 * scoped to their windows (range.ts's dashboardRangeWindow +
 * previousEqualRange); this only narrows by operator. */
export function computeKpiTotals(
  currentRows: TelemetryRow[],
  previousRows: TelemetryRow[],
  labelMaps: EntityLabelMaps,
  operatorEmail: string | null
): DashboardKpiTotals {
  return {
    current: windowTotals(filterRows(currentRows, { operatorEmail }), labelMaps),
    previous: windowTotals(filterRows(previousRows, { operatorEmail }), labelMaps),
  };
}

/** The four cards, deltas included. Deltas stay here rather than in SQL so
 * they keep JS Math.round (half towards +Infinity) exactly. */
export function buildDashboardKpis(totals: DashboardKpiTotals, draftsTotal: number): DashboardKpis {
  const { current, previous } = totals;
  return {
    activeOperators: { value: current.activeOperators, deltaPercent: delta(current.activeOperators, previous.activeOperators) },
    totalActiveMs: { value: current.activeMs, deltaPercent: delta(current.activeMs, previous.activeMs) },
    draftCount: { value: draftsTotal, deltaPercent: null },
    zeroResultSearches: {
      value: current.zeroResultSearches,
      deltaPercent: delta(current.zeroResultSearches, previous.zeroResultSearches),
    },
  };
}
