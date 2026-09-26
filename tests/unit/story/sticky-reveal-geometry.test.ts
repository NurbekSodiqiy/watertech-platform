import { describe, expect, it } from "vitest";
import {
  activeBeatIndex,
  BEAT_OFFSET,
  BEAT_SECTION_VH,
  FINALE_VH,
  LIST_END_AT_PAGE_END,
  RAIL_OFFSET,
  READING_LINE,
} from "@/components/story/sticky-reveal-geometry";

// The beats of /company/about: four chapters and the finale
// (app/[locale]/(app)/company/about/page.tsx).
const BEATS = 5;
const EPSILON = 1e-6;

describe("activeBeatIndex", () => {
  it("is the beat of each breakpoint, exactly on it", () => {
    for (let index = 0; index < BEATS; index += 1) {
      expect(activeBeatIndex(index / BEATS, BEATS)).toBe(index);
    }
  });

  it("switches half-way between two breakpoints, the earlier beat winning a tie", () => {
    for (let index = 0; index < BEATS - 1; index += 1) {
      const boundary = (index + 0.5) / BEATS;
      expect(activeBeatIndex(boundary - EPSILON, BEATS)).toBe(index);
      expect(activeBeatIndex(boundary, BEATS)).toBe(index);
      expect(activeBeatIndex(boundary + EPSILON, BEATS)).toBe(index + 1);
    }
  });

  it("walks every beat in order, once, from 0 to 1", () => {
    const seen: number[] = [];
    for (let step = 0; step <= 1000; step += 1) {
      const index = activeBeatIndex(step / 1000, BEATS);
      if (seen[seen.length - 1] !== index) seen.push(index);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
  });

  it("clamps progress outside 0…1 to the first and last beat", () => {
    expect(activeBeatIndex(-0.5, BEATS)).toBe(0);
    expect(activeBeatIndex(-1e9, BEATS)).toBe(0);
    expect(activeBeatIndex(1, BEATS)).toBe(BEATS - 1);
    expect(activeBeatIndex(1.7, BEATS)).toBe(BEATS - 1);
    expect(activeBeatIndex(1e9, BEATS)).toBe(BEATS - 1);
  });

  it("always answers 0 for a single beat", () => {
    for (const progress of [-1, 0, 0.3, 0.5, 1, 2]) {
      expect(activeBeatIndex(progress, 1)).toBe(0);
    }
  });

  it("answers 0 for non-finite progress or no beats", () => {
    expect(activeBeatIndex(Number.NaN, BEATS)).toBe(0);
    expect(activeBeatIndex(Number.POSITIVE_INFINITY, BEATS)).toBe(0);
    expect(activeBeatIndex(Number.NEGATIVE_INFINITY, BEATS)).toBe(0);
    expect(activeBeatIndex(0.9, 0)).toBe(0);
    expect(activeBeatIndex(0.9, -3)).toBe(0);
    expect(activeBeatIndex(0.9, Number.NaN)).toBe(0);
  });
});

describe("scroll offsets", () => {
  /** "start 0.075" → 0.075: the viewport fraction of one offset edge. */
  function edge(offset: unknown, target: "start" | "end"): number {
    expect(typeof offset).toBe("string");
    const [name, at] = String(offset).split(" ");
    expect(name).toBe(target);
    return at === "end" ? 1 : Number(at);
  }

  // The list ≥ lg: four chapter sections, then the finale.
  const LIST = (BEATS - 1) * BEAT_SECTION_VH + FINALE_VH;
  const START = edge(BEAT_OFFSET?.[0], "start");
  const END = edge(BEAT_OFFSET?.[1], "end");

  /** The beat progress when the reading line sits `at` into the list (viewport heights). */
  function progressAt(at: number): number {
    // 0 when the list's top is at START, 1 when its end is at END.
    const from = READING_LINE - START;
    const to = READING_LINE - END + LIST;
    return (at - from) / (to - from);
  }

  it("puts the start edge half a section above the reading line", () => {
    expect(BEAT_OFFSET).toHaveLength(2);
    expect(START).toBeCloseTo(READING_LINE - BEAT_SECTION_VH / 2, 10);
  });

  it("switches beat k + 1 exactly where section k + 1's top meets the reading line", () => {
    for (let index = 0; index < BEATS - 1; index += 1) {
      const top = (index + 1) * BEAT_SECTION_VH;
      expect(activeBeatIndex(progressAt(top - 0.01), BEATS)).toBe(index);
      expect(activeBeatIndex(progressAt(top + 0.01), BEATS)).toBe(index + 1);
      expect(progressAt(top)).toBeCloseTo((index + 0.5) / BEATS, 10);
    }
  });

  it("reaches the finale before the page ends, with room to spare", () => {
    // At the end of the page the list's end is at LIST_END_AT_PAGE_END.
    const atPageEnd = READING_LINE - LIST_END_AT_PAGE_END + LIST;
    expect(activeBeatIndex(progressAt(atPageEnd), BEATS)).toBe(BEATS - 1);
    // …and at least 5% of the viewport before it.
    expect(activeBeatIndex(progressAt(atPageEnd - 0.05), BEATS)).toBe(BEATS - 1);
    // The finale's top has climbed past the reading line.
    expect(LIST_END_AT_PAGE_END - FINALE_VH).toBeLessThan(READING_LINE);
  });

  it("starts at the first beat with the list's top anywhere below the start edge", () => {
    for (const listTop of [START, 0.2, 0.35, 0.8]) {
      expect(activeBeatIndex(progressAt(READING_LINE - listTop), BEATS)).toBe(0);
    }
  });

  it("starts the rail with the beats and fills it when the list's end reaches the viewport bottom", () => {
    expect(RAIL_OFFSET).toHaveLength(2);
    expect(edge(RAIL_OFFSET?.[0], "start")).toBe(START);
    expect(edge(RAIL_OFFSET?.[1], "end")).toBe(1);
  });
});
