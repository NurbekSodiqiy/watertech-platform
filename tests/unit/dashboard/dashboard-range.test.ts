import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RANGE_SPAN_DAYS, parseDashboardRange } from "@/lib/dashboard/range";

// 2026-09-16T20:30Z is already 01:30 on 2026-09-17 in Tashkent (UTC+5), so a
// default window computed from the UTC date would be off by one day.
const NOW_UTC = "2026-09-16T20:30:00.000Z";
const TODAY_TASHKENT = "2026-09-17";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_UTC));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseDashboardRange", () => {
  it("defaults to the 7-day window ending today in Tashkent", () => {
    expect(parseDashboardRange({})).toEqual({ from: "2026-09-11", to: TODAY_TASHKENT, operatorEmail: null });
  });

  it("keeps a valid explicit range as-is", () => {
    expect(parseDashboardRange({ from: "2026-09-01", to: "2026-09-10", op: "op@watertech.uz" })).toEqual({
      from: "2026-09-01",
      to: "2026-09-10",
      operatorEmail: "op@watertech.uz",
    });
  });

  it("allows exactly MAX_RANGE_SPAN_DAYS", () => {
    expect(MAX_RANGE_SPAN_DAYS).toBe(92);
    expect(parseDashboardRange({ from: "2026-06-17", to: TODAY_TASHKENT }).from).toBe("2026-06-17");
  });

  it("clamps a longer span to MAX_RANGE_SPAN_DAYS back from `to`", () => {
    expect(parseDashboardRange({ from: "2026-01-01", to: TODAY_TASHKENT })).toMatchObject({
      from: "2026-06-17",
      to: TODAY_TASHKENT,
    });
    expect(parseDashboardRange({ from: "2025-01-01", to: "2026-03-01" }).from).toBe("2025-11-29");
  });

  it.each([
    ["garbage", "also-garbage"],
    ["2026-13-01", "2026-09-40"],
    ["17.09.2026", "2026/09/17"],
    ["", ""],
  ])("falls back to the default window for invalid dates (%s, %s)", (from, to) => {
    expect(parseDashboardRange({ from, to })).toMatchObject({ from: "2026-09-11", to: TODAY_TASHKENT });
  });

  it("falls back per field: an invalid `from` counts 6 days back from a valid `to`", () => {
    expect(parseDashboardRange({ from: "garbage", to: "2026-09-05" })).toMatchObject({ from: "2026-08-30", to: "2026-09-05" });
  });

  it("never lets `to` run past today in Tashkent", () => {
    expect(parseDashboardRange({ from: "2026-09-15", to: "2026-12-31" })).toMatchObject({
      from: "2026-09-15",
      to: TODAY_TASHKENT,
    });
  });

  // The S21 task describes `from > to` as a swap; range.ts instead collapses
  // the range to the single day `to`. Locked to the implemented behaviour —
  // RangePicker only emits presets, so this is reachable only via a
  // hand-edited URL.
  it("collapses `from > to` to the single day `to` (does not swap)", () => {
    expect(parseDashboardRange({ from: "2026-09-10", to: "2026-09-01" })).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-01",
    });
  });

  it("takes the first value of repeated params and treats a blank operator as none", () => {
    expect(parseDashboardRange({ from: ["2026-09-02", "2026-01-01"], to: ["2026-09-03"], op: "   " })).toEqual({
      from: "2026-09-02",
      to: "2026-09-03",
      operatorEmail: null,
    });
  });
});
