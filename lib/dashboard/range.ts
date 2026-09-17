import "server-only";
import { todayInTashkent, tashkentDayRangeUTC, isValidDateString } from "@/lib/telemetry/aggregate";

/** Longest span a manager can query in one go — keeps the combined telemetry
 * query (current range + the equal-length previous range right before it,
 * see combinedQueryWindow) bounded to at most ~184 days of rows. */
export const MAX_RANGE_SPAN_DAYS = 92;

export interface DashboardRange {
  from: string;
  to: string;
  operatorEmail: string | null;
}

export interface RangeWindow {
  startUTC: string;
  endUTC: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** URL is the source of truth for the dashboard's range + operator filter —
 * every tab parses the same three GET params (?from&to&op) the same way, so
 * switching tabs or reloading never loses the manager's selection. Invalid
 * or missing values fall back to "last 7 days including today", clamped to
 * MAX_RANGE_SPAN_DAYS. */
export function parseDashboardRange(searchParams: Record<string, string | string[] | undefined>): DashboardRange {
  const rawFrom = singleParam(searchParams.from);
  const rawTo = singleParam(searchParams.to);
  const rawOp = singleParam(searchParams.op);

  const today = todayInTashkent();
  const to = isValidDateString(rawTo) && rawTo <= today ? rawTo : today;
  let from = isValidDateString(rawFrom) ? rawFrom : addDays(to, -6);
  if (from > to) from = to;
  if (daysBetween(from, to) > MAX_RANGE_SPAN_DAYS) from = addDays(to, -MAX_RANGE_SPAN_DAYS);

  return { from, to, operatorEmail: rawOp && rawOp.trim() !== "" ? rawOp : null };
}

export function dashboardRangeWindow(range: DashboardRange): RangeWindow {
  const { startUTC } = tashkentDayRangeUTC(range.from);
  const { endUTC } = tashkentDayRangeUTC(range.to);
  return { startUTC, endUTC };
}

/** The equal-length period immediately before `range`, for the KPI cards'
 * delta — e.g. "7 kun" (Mon–Sun) compares against the 7 days before that. */
export function previousEqualRange(range: DashboardRange): DashboardRange {
  const spanDays = daysBetween(range.from, range.to) + 1;
  const prevTo = addDays(range.from, -1);
  const prevFrom = addDays(prevTo, -(spanDays - 1));
  return { from: prevFrom, to: prevTo, operatorEmail: range.operatorEmail };
}

/** One window spanning both the previous and the current range, so a page
 * needs exactly one telemetry query per render (see CLAUDE.md #4 / dashboard
 * task item 6) instead of two — the two halves are split back out of the
 * returned rows by comparing `ts` against dashboardRangeWindow(range).startUTC. */
export function combinedQueryWindow(range: DashboardRange): RangeWindow {
  const { startUTC } = dashboardRangeWindow(previousEqualRange(range));
  const { endUTC } = dashboardRangeWindow(range);
  return { startUTC, endUTC };
}

export interface RangePreset {
  key: string;
  label: string;
  from: string;
  to: string;
}

export function buildRangePresets(): RangePreset[] {
  const today = todayInTashkent();
  const monthStart = `${today.slice(0, 7)}-01`;
  return [
    { key: "today", label: "Bugun", from: today, to: today },
    { key: "7d", label: "7 kun", from: addDays(today, -6), to: today },
    { key: "30d", label: "30 kun", from: addDays(today, -29), to: today },
    { key: "month", label: "Oy boshidan", from: monthStart, to: today },
  ];
}
