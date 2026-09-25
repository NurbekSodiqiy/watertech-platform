import { describe, expect, it } from "vitest";
import { MIN_VISIBLE_PERCENT, barPercent, seriesMax } from "@/lib/admin/charts";

describe("seriesMax", () => {
  it("is 0 for an empty or all-zero series", () => {
    expect(seriesMax([])).toBe(0);
    expect(seriesMax([0, 0, 0])).toBe(0);
  });

  it("ignores negative and non-finite values", () => {
    expect(seriesMax([-5, 3, Number.NaN, Number.POSITIVE_INFINITY, 2])).toBe(3);
  });
});

describe("barPercent", () => {
  it("draws nothing for zero, and nothing when everything is zero", () => {
    expect(barPercent(0, 10)).toBe(0);
    expect(barPercent(0, 0)).toBe(0);
    expect(barPercent(5, 0)).toBe(0);
  });

  it("scales against the largest value", () => {
    expect(barPercent(10, 10)).toBe(100);
    expect(barPercent(5, 10)).toBe(50);
    expect(barPercent(1, 4)).toBe(25);
  });

  it("keeps a tiny non-zero value visible next to a large one", () => {
    expect(barPercent(1, 10_000)).toBe(MIN_VISIBLE_PERCENT);
  });

  it("never exceeds the track or accepts garbage", () => {
    expect(barPercent(20, 10)).toBe(100);
    expect(barPercent(-3, 10)).toBe(0);
    expect(barPercent(Number.NaN, 10)).toBe(0);
    expect(barPercent(3, Number.NaN)).toBe(0);
  });
});
