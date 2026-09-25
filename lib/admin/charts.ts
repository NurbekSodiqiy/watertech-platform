// Pure geometry for the admin chart primitives (components/admin/charts/,
// CLAUDE.md §15). Bars are sized with inline style percentages computed here,
// so tests/unit/admin/charts.test.ts can pin the edge cases (empty, all-zero,
// a tiny value next to a large one) without rendering anything.

/** Smallest visible length for a non-zero value, in % of the track — a sliver
 * still says "not nothing" next to the leader. */
export const MIN_VISIBLE_PERCENT = 2;

/** Largest value of a series; 0 for an empty or all-zero one. Negative and
 * non-finite values count as 0 — a bar cannot be shorter than nothing. */
export function seriesMax(values: readonly number[]): number {
  let max = 0;
  for (const value of values) if (Number.isFinite(value) && value > max) max = value;
  return max;
}

/** A bar's length in % of `max`: 0 for zero (or when everything is zero),
 * otherwise at least MIN_VISIBLE_PERCENT and at most 100. */
export function barPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max((value / max) * 100, MIN_VISIBLE_PERCENT));
}
