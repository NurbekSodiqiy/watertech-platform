import { describe, expect, it } from "vitest";
import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";
import {
  boreRadius,
  CHAPTER_BEAT,
  CHAPTER_BEAT_OFFSET,
  estimateLabelWidth,
  FINALE_BEAT,
  FINALE_BEAT_OFFSET,
  labelArcPath,
  labelMaxWidth,
  LAYERS_VIEWBOX,
  polar,
  RING_GAP,
  RING_WIDTH,
  ringBandOpacity,
  ringDrawn,
  ringLabelOpacity,
  ringPath,
  ringRadius,
  ringSettle,
  SEAM_DEGREES,
  SETTLED_OPACITY,
  waterFill,
  waveDrawn,
  wavePath,
} from "@/components/story/layers-geometry";

// The chapters of /company/about, in ring order (app/[locale]/(app)/company/about/page.tsx).
const CHAPTERS = ["about", "production", "goal", "whyUs"] as const;
const RINGS = CHAPTERS.length;
const CENTRE = LAYERS_VIEWBOX / 2;

/** Every number in a path string, in order. */
function numbers(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Beat progress when the tracked top edge is at `top` (fraction of the viewport). */
function beatAt(top: number, lines: { start: number; end: number }): number {
  return Math.min(1, Math.max(0, (lines.start - top) / (lines.start - lines.end)));
}

describe("layers geometry", () => {
  it("stacks the rings outer → inner, a hairline apart, inside the figure", () => {
    expect(ringRadius(0) + RING_WIDTH / 2).toBeLessThanOrEqual(LAYERS_VIEWBOX / 2);
    for (let i = 1; i < RINGS; i += 1) {
      const outerEdge = ringRadius(i) + RING_WIDTH / 2;
      const previousInnerEdge = ringRadius(i - 1) - RING_WIDTH / 2;
      expect(previousInnerEdge - outerEdge).toBeCloseTo(RING_GAP, 6);
    }
    const lastInnerEdge = ringRadius(RINGS - 1) - RING_WIDTH / 2;
    expect(lastInnerEdge - boreRadius(RINGS)).toBeCloseTo(RING_GAP, 6);
    expect(boreRadius(RINGS)).toBeGreaterThan(LAYERS_VIEWBOX / 6);
  });

  it("draws each ring as one clockwise turn from the seam, closing just past it", () => {
    for (let i = 0; i < RINGS; i += 1) {
      const d = ringPath(i);
      const r = ringRadius(i);
      const seam = polar(r, SEAM_DEGREES);
      const values = numbers(d);
      // M x y, then two arcs "r r 0 1 1 x y": large-arc and sweep (clockwise) set.
      expect(values.slice(0, 2)).toEqual([seam.x, seam.y]);
      expect(d.match(/ 0 1 1 /g)).toHaveLength(2);
      // The end overlaps the start by a sliver (no hairline at the seam), on
      // the clockwise side of it, and stays on the ring.
      const [endX, endY] = values.slice(-2);
      const past = Math.hypot(endX - seam.x, endY - seam.y);
      expect(past).toBeGreaterThan(0.5);
      expect(past).toBeLessThan(RING_WIDTH / 2);
      expect(Math.hypot(endX - CENTRE, endY - CENTRE)).toBeCloseTo(r, 1);
      expect(endX).toBeGreaterThan(seam.x);
    }
  });

  it("centres every label arc on 12 o'clock, running left to right over the top", () => {
    for (let i = 0; i < RINGS; i += 1) {
      const [x0, y0, , , , , , x1, y1] = numbers(labelArcPath(i));
      expect(x0 + x1).toBeCloseTo(2 * CENTRE, 1);
      expect(y0).toBeCloseTo(y1, 6);
      expect(y0).toBeLessThan(CENTRE);
      expect(x0).toBeLessThan(x1);
    }
  });

  it("fits every ring label, in both locales, between 12 o'clock and the seam", () => {
    for (const [locale, messages] of [["uz", uz], ["ru", ru]] as const) {
      const labels = messages.pages.company.about.rings;
      CHAPTERS.forEach((key, index) => {
        const label = labels[key];
        expect(label.trim(), `${locale} rings.${key}`).not.toBe("");
        expect(estimateLabelWidth(label), `${locale} rings.${key} "${label}"`).toBeLessThanOrEqual(labelMaxWidth(index));
      });
    }
  });

  it("keeps the wave inside the bore", () => {
    const bore = boreRadius(RINGS);
    const values = numbers(wavePath(bore));
    const startX = values[0];
    expect(startX).toBeLessThan(0);
    expect(Math.abs(startX)).toBeLessThan(bore);
  });

  it("builds the scroll offsets from the beat lines", () => {
    expect(CHAPTER_BEAT_OFFSET).toEqual([`start ${CHAPTER_BEAT.start}`, `start ${CHAPTER_BEAT.end}`]);
    expect(FINALE_BEAT_OFFSET).toEqual([`start ${FINALE_BEAT.start}`, `start ${FINALE_BEAT.end}`]);
    expect(CHAPTER_BEAT).toEqual({ start: 0.7, end: 0.35 });
  });
});

describe("layers timing", () => {
  it("never leaves a ring behind a later beat", () => {
    expect(ringDrawn([0.2, 0.9, 0])).toBe(0.9);
    expect(ringDrawn([0.4, 0, 0])).toBe(0.4);
    expect(ringDrawn([0, 0, 1])).toBe(1);
    expect(ringDrawn([1.2])).toBe(1);
    expect(ringDrawn([])).toBe(0);
  });

  it("keeps a ring fully active until it closes, when chapters are 16% of the viewport apart", () => {
    // Ring i closes when its heading reaches the end line; the next heading is
    // one chapter spacing lower at that moment.
    for (const spacing of [0.16, 0.2, 0.28, 0.4]) {
      const nextBeat = beatAt(CHAPTER_BEAT.end + spacing, CHAPTER_BEAT);
      expect(ringSettle(nextBeat), `spacing ${spacing}`).toBe(0);
      expect(ringLabelOpacity(1, ringSettle(nextBeat))).toBe(1);
    }
    expect(ringSettle(1)).toBe(1);
  });

  it("settles a ring to the settled opacity, never below", () => {
    expect(ringBandOpacity(0)).toBe(1);
    expect(ringBandOpacity(1)).toBeCloseTo(SETTLED_OPACITY, 6);
    expect(ringBandOpacity(2)).toBeCloseTo(SETTLED_OPACITY, 6);
  });

  it("lights a label only once the band is under it", () => {
    expect(ringLabelOpacity(0.5, 0)).toBe(0);
    expect(ringLabelOpacity(0.85, 0)).toBe(0);
    expect(ringLabelOpacity(1, 0)).toBe(1);
    expect(ringLabelOpacity(1, 1)).toBe(0);
  });

  it("fills the bore before the wave draws, and finishes both", () => {
    expect(waterFill(0)).toBe(0);
    expect(waveDrawn(0.4)).toBe(0);
    expect(waterFill(0.4)).toBeGreaterThan(0.5);
    expect(waterFill(0.7)).toBe(1);
    expect(waveDrawn(1)).toBe(1);
  });

  it("ends in the reduced-motion picture when every beat is complete", () => {
    const beats = [1, 1, 1, 1, 1];
    for (let i = 0; i < RINGS; i += 1) {
      const drawn = ringDrawn(beats.slice(i));
      const settle = ringSettle(beats[i + 1] ?? 1);
      expect(drawn).toBe(1);
      expect(ringBandOpacity(settle)).toBeCloseTo(SETTLED_OPACITY, 6);
      expect(ringLabelOpacity(drawn, settle)).toBe(0);
    }
    expect(waterFill(1)).toBe(1);
    expect(waveDrawn(1)).toBe(1);
  });
});
