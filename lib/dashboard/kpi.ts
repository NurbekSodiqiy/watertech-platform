import "server-only";
import {
  aggregatePerOperator,
  aggregateZeroResultSearches,
  filterRows,
  type TelemetryRow,
  type EntityLabelMaps,
} from "@/lib/telemetry/aggregate";
import { getContentHealth } from "@/lib/dashboard/content-health";

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

function activeOperatorCount(rows: TelemetryRow[]): number {
  return new Set(rows.filter((r) => r.type === "page_enter").map((r) => r.user_email)).size;
}

function totalActiveMs(rows: TelemetryRow[], labelMaps: EntityLabelMaps): number {
  return aggregatePerOperator(rows, 0, labelMaps).reduce((sum, op) => sum + op.activeMs, 0);
}

function totalZeroResultSearches(rows: TelemetryRow[]): number {
  return aggregateZeroResultSearches(rows).reduce((sum, s) => sum + s.count, 0);
}

function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** current/previousRows must already be scoped to their respective windows
 * (see lib/dashboard/range.ts's combinedQueryWindow + dashboardRangeWindow)
 * — this only splits by operator, never by date, so callers do the range
 * split once and pass both halves in. */
export async function computeDashboardKpis(
  currentRows: TelemetryRow[],
  previousRows: TelemetryRow[],
  labelMaps: EntityLabelMaps,
  operatorEmail: string | null
): Promise<DashboardKpis> {
  const curRows = filterRows(currentRows, { operatorEmail });
  const prevRows = filterRows(previousRows, { operatorEmail });

  const curActive = activeOperatorCount(curRows);
  const prevActive = activeOperatorCount(prevRows);

  const curMs = totalActiveMs(curRows, labelMaps);
  const prevMs = totalActiveMs(prevRows, labelMaps);

  const curZero = totalZeroResultSearches(curRows);
  const prevZero = totalZeroResultSearches(prevRows);

  const { draftsTotal } = await getContentHealth();

  return {
    activeOperators: { value: curActive, deltaPercent: delta(curActive, prevActive) },
    totalActiveMs: { value: curMs, deltaPercent: delta(curMs, prevMs) },
    draftCount: { value: draftsTotal, deltaPercent: null },
    zeroResultSearches: { value: curZero, deltaPercent: delta(curZero, prevZero) },
  };
}
