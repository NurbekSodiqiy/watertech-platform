import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  aggregateHourly,
  aggregatePerOperator,
  aggregateWebVitals,
  aggregateZeroResultSearches,
  filterRows,
  type EntityLabelMaps,
  type TelemetryRow,
} from "@/lib/telemetry/aggregate";
import { TELEMETRY_EVENT_TYPES } from "@/lib/telemetry/types";
import {
  aggregateMostViewed,
  aggregateNotHelpful,
  aggregateZeroResultQueriesDetailed,
} from "@/lib/dashboard/quality";
import { buildDashboardKpis, computeKpiTotals } from "@/lib/dashboard/kpi";
import { dashboardRangeWindow, previousEqualRange } from "@/lib/dashboard/range";
import {
  toHourly,
  toKpiTotals,
  toMostViewed,
  toNotHelpful,
  toOperatorSummaries,
  toWebVitals,
  toZeroResultSearches,
} from "@/lib/dashboard/telemetry-rpc";

// quality.ts also holds fetchOnboardingProgress, whose client reads env at
// import; none of it runs here.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

// One expected table for both sides: supabase/tests/dashboard-parity.sql
// asserts the SQL functions return the `expected` rows of its $parity$
// document; this file runs the TS reference aggregators over the same
// `events` and asserts that those expected rows, mapped by
// lib/dashboard/telemetry-rpc.ts, are exactly what the reference produces.
// Together: SQL + mapper = reference.

const SQL_PATH = path.resolve(__dirname, "../../../supabase/tests/dashboard-parity.sql");

function readParityDocument(): unknown {
  const sql = readFileSync(SQL_PATH, "utf8");
  // Anchored on the set_config call: the file's header comment names the
  // markers too.
  const match = /set_config\('dashboard_parity\.doc', \$parity\$([\s\S]*?)\$parity\$/.exec(sql);
  if (!match) throw new Error(`no $parity$ document in ${SQL_PATH}`);
  return JSON.parse(match[1]);
}

const eventSchema = z
  .object({
    user_email: z.string(),
    session_id: z.string(),
    ts: z.string().datetime(),
    type: z.enum(TELEMETRY_EVENT_TYPES),
    path: z.string(),
    entity_type: z.string().nullable().default(null),
    entity_id: z.string().nullable().default(null),
    duration_ms: z.number().int().nullable().default(null),
    meta: z.record(z.unknown()).nullable().default(null),
  })
  .strict();

const count = z.number().int().nonnegative();

const scopeSchema = z
  .object({
    kpis: z.object({
      active_operators: count,
      active_operators_prev: count,
      active_ms: count,
      active_ms_prev: count,
      zero_result_searches: count,
      zero_result_searches_prev: count,
    }),
    operator_activity: z.array(
      z.object({
        operator_email: z.string(),
        active_ms: count,
        copy_count: count,
        checklist_completed: count,
        top_viewed: z.array(
          z.object({ view_type: z.string(), entity_id: z.string().nullable(), path: z.string(), view_count: count })
        ),
      })
    ),
    hourly: z.array(count).length(24),
    zero_result_searches: z.array(
      z.object({ search_query: z.string(), search_count: count, last_seen_at: z.string().datetime() })
    ),
    web_vitals: z.array(z.object({ metric_name: z.string(), p50: z.number(), p75: z.number(), samples: count })),
    not_helpful: z.array(z.object({ page_path: z.string(), feedback_count: count })),
    most_viewed: z.array(
      z.object({ view_type: z.string(), view_entity_id: z.string().nullable(), view_path: z.string(), view_count: count })
    ),
  })
  .strict();

const documentSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  windows: z.object({ from: z.string().datetime(), to: z.string().datetime(), prevFrom: z.string().datetime() }),
  operator: z.string(),
  checklistTotal: count,
  events: z.array(eventSchema),
  expected: z.object({ all: scopeSchema, operator: scopeSchema }).strict(),
});

const doc = documentSchema.parse(readParityDocument());

/** Insertion order is id order in the SQL fixture; the reference sees rows
 * sorted by (ts, id) — the order the SQL tie-breaks rank by. */
const rows: TelemetryRow[] = doc.events
  .map((event, index): TelemetryRow => ({ ...event, id: index + 1, created_at: event.ts }))
  .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts) || a.id - b.id);

const from = Date.parse(doc.windows.from);
const to = Date.parse(doc.windows.to);
const prevFrom = Date.parse(doc.windows.prevFrom);
const currentRows = rows.filter((r) => Date.parse(r.ts) >= from && Date.parse(r.ts) < to);
const previousRows = rows.filter((r) => Date.parse(r.ts) >= prevFrom && Date.parse(r.ts) < from);

/** Labels for the fixture's ids; an id missing here (obj-unknown) falls back
 * to the raw id on both sides. */
const maps: EntityLabelMaps = {
  scriptNameById: new Map([["lead-orqali-tushgan", "Lead orqali tushgan"]]),
  stageLabelById: new Map([["st-1", "Lead orqali tushgan — Salomlashish"]]),
  objectionLabelById: new Map([["obj-qimmat", "Qimmat"]]),
  competitorNameById: new Map([["comp-x", "Raqobatchi X"]]),
  packageNameById: new Map([["pkg-1", "Start"]]),
};

describe("parity fixture", () => {
  it("uses the windows lib/dashboard/range.ts derives from its Tashkent dates", () => {
    const range = { from: doc.range.from, to: doc.range.to, operatorEmail: null };
    expect(dashboardRangeWindow(range)).toEqual({ startUTC: doc.windows.from, endUTC: doc.windows.to });
    expect(dashboardRangeWindow(previousEqualRange(range)).startUTC).toBe(doc.windows.prevFrom);
  });

  it("puts boundary events on the right side of each window", () => {
    // The instants on the boundaries are the ones a string comparison between
    // two ISO formats could misfile.
    expect(currentRows.some((r) => r.ts === doc.windows.from)).toBe(true);
    expect(currentRows.some((r) => r.ts === doc.windows.to)).toBe(false);
    expect(previousRows.some((r) => r.ts === doc.windows.prevFrom)).toBe(true);
    expect(previousRows.some((r) => r.ts === doc.windows.from)).toBe(false);
  });
});

describe.each([
  { scope: "all" as const, operatorEmail: null },
  { scope: "operator" as const, operatorEmail: doc.operator },
])("SQL expected rows = TS reference ($scope)", ({ scope, operatorEmail }) => {
  const expected = doc.expected[scope];
  const scoped = filterRows(currentRows, { operatorEmail });

  it("dashboard_kpis", () => {
    expect(toKpiTotals(expected.kpis)).toEqual(computeKpiTotals(currentRows, previousRows, maps, operatorEmail));
  });

  it("dashboard_operator_activity", () => {
    expect(toOperatorSummaries(expected.operator_activity, doc.checklistTotal, maps)).toEqual(
      aggregatePerOperator(scoped, doc.checklistTotal, maps)
    );
  });

  it("dashboard_hourly", () => {
    const hourlyRows = expected.hourly.map((event_count, hour_of_day) => ({ hour_of_day, event_count }));
    expect(toHourly(hourlyRows)).toEqual(aggregateHourly(scoped));
  });

  it("dashboard_zero_result_searches (both tabs' shapes)", () => {
    const groups = toZeroResultSearches(expected.zero_result_searches);
    expect(groups).toEqual(aggregateZeroResultQueriesDetailed(scoped));
    expect(groups.map(({ query, count }) => ({ query, count }))).toEqual(aggregateZeroResultSearches(scoped));
  });

  it("dashboard_web_vitals", () => {
    expect(toWebVitals(expected.web_vitals)).toEqual(aggregateWebVitals(scoped));
  });

  it("dashboard_not_helpful", () => {
    expect(toNotHelpful(expected.not_helpful)).toEqual(aggregateNotHelpful(scoped));
  });

  it("dashboard_most_viewed", () => {
    expect(toMostViewed(expected.most_viewed, maps)).toEqual(aggregateMostViewed(scoped, maps));
  });
});

describe("the expected table itself (hand-computed)", () => {
  it("KPI cards, deltas included", () => {
    expect(buildDashboardKpis(toKpiTotals(doc.expected.all.kpis), 5)).toEqual({
      activeOperators: { value: 2, deltaPercent: 100 },
      totalActiveMs: { value: 360_000, deltaPercent: 200 },
      draftCount: { value: 5, deltaPercent: null },
      zeroResultSearches: { value: 7, deltaPercent: 250 },
    });
    // No page_enter from this operator in the previous window: nothing to compare against.
    expect(buildDashboardKpis(toKpiTotals(doc.expected.operator.kpis), 5).activeOperators).toEqual({
      value: 1,
      deltaPercent: null,
    });
  });

  it("per-operator card: labels, admin links, clamp and first-seen tie-break", () => {
    const [a, d, b] = toOperatorSummaries(doc.expected.all.operator_activity, doc.checklistTotal, maps);
    // 500 000 ms visible − (20 000 + 30 000 + 40 000 + 50 000) ms idle.
    expect(a.activeMs).toBe(360_000);
    expect(a.checklistPercent).toBe(38); // 3 of 8, Math.round(37.5)
    expect(a.topViewed.map((v) => [v.label, v.count, v.adminHref])).toEqual([
      ["Lead orqali tushgan — Salomlashish", 2, "/admin/scripts"],
      ["Qimmat", 2, "/admin/objections/obj-qimmat"],
      ["Narxi qancha?", 1, null],
      ["Raqobatchi X", 1, "/admin/competitors/comp-x"],
      ["Start", 1, "/admin/packages/pkg-1"],
    ]);
    // b's idle time exceeds its visible time: clamped to 0, not negative. d and
    // b tie at 0 and keep first-seen order (d at 04:20, b at 04:30) — not email order.
    expect([d.email, d.activeMs, b.email, b.activeMs]).toEqual(["parity-d@test", 0, "parity-b@test", 0]);
  });

  it("a view without entity_id is labelled by its path", () => {
    const items = toMostViewed(doc.expected.all.most_viewed, maps);
    expect(items[3]).toEqual({ label: "/sales-process/scripts/x", count: 1, adminHref: "/admin/scripts" });
    expect(items[4]).toEqual({ label: "obj-unknown", count: 1, adminHref: "/admin/objections/obj-unknown" });
  });
});
