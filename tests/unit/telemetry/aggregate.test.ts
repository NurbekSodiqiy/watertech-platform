import { describe, expect, it } from "vitest";
import {
  tashkentDayRangeUTC,
  aggregatePerOperator,
  buildEntityLabelMaps,
  type TelemetryRow,
} from "@/lib/telemetry/aggregate";
import type { ContentBundle } from "@/lib/content/loader";

describe("tashkentDayRangeUTC", () => {
  it("converts a Tashkent calendar date to the matching UTC instant range", () => {
    const { startUTC, endUTC } = tashkentDayRangeUTC("2026-09-13");
    expect(startUTC).toBe("2026-09-12T19:00:00.000Z");
    expect(endUTC).toBe("2026-09-13T19:00:00.000Z");
  });
});

const emptyBundle: ContentBundle = {
  scripts: [],
  objections: [],
  faqs: [],
  competitors: [],
  packageGroups: [],
};

function row(partial: Partial<TelemetryRow> & Pick<TelemetryRow, "type" | "ts">): TelemetryRow {
  return {
    id: 0,
    user_email: "op@watertech.uz",
    session_id: "s1",
    entity_type: null,
    entity_id: null,
    duration_ms: null,
    meta: null,
    created_at: partial.ts,
    path: "/",
    ...partial,
  };
}

describe("aggregatePerOperator", () => {
  const maps = buildEntityLabelMaps(emptyBundle);

  it("computes activeMs as page_leave duration sum minus idle time", () => {
    const rows: TelemetryRow[] = [
      row({ type: "page_leave", ts: "2026-09-13T09:00:00.000Z", duration_ms: 100_000 }),
      row({ type: "page_leave", ts: "2026-09-13T10:00:00.000Z", duration_ms: 50_000 }),
      row({ type: "idle_start", ts: "2026-09-13T09:30:00.000Z" }),
      row({ type: "idle_end", ts: "2026-09-13T09:30:20.000Z" }),
    ];
    const [summary] = aggregatePerOperator(rows, 0, maps);
    expect(summary.activeMs).toBe(100_000 + 50_000 - 20_000);
  });

  it("orders topViewed by descending count", () => {
    const rows: TelemetryRow[] = [
      ...Array.from({ length: 3 }, (_, i) =>
        row({ type: "stage_view", ts: `2026-09-13T09:0${i}:00.000Z`, entity_id: "stage1" })
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        row({ type: "objection_view", ts: `2026-09-13T09:1${i}:00.000Z`, entity_id: "obj1" })
      ),
      row({ type: "competitor_view", ts: "2026-09-13T09:20:00.000Z", entity_id: "comp1" }),
    ];
    const [summary] = aggregatePerOperator(rows, 0, maps);
    expect(summary.topViewed.map((v) => v.count)).toEqual([3, 2, 1]);
    expect(summary.topViewed[0].label).toBe("stage1");
  });

  it("lets the latest checklist toggle per item decide its checked state", () => {
    const rows: TelemetryRow[] = [
      row({
        type: "checklist_toggle",
        ts: "2026-09-13T09:00:00.000Z",
        entity_id: "item1",
        meta: { checked: true },
      }),
      row({
        type: "checklist_toggle",
        ts: "2026-09-13T09:05:00.000Z",
        entity_id: "item1",
        meta: { checked: false },
      }),
      row({
        type: "checklist_toggle",
        ts: "2026-09-13T09:01:00.000Z",
        entity_id: "item2",
        meta: { checked: true },
      }),
    ];
    const [summary] = aggregatePerOperator(rows, 5, maps);
    // item1 toggled on then off -> not completed; item2 toggled on -> completed.
    expect(summary.checklistCompleted).toBe(1);
    expect(summary.checklistTotal).toBe(5);
    expect(summary.checklistPercent).toBe(20);
  });
});
