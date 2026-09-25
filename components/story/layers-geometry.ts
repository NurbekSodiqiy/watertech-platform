import type { UseScrollOptions } from "framer-motion";

/**
 * Geometry and timing of the "Qatlamlar" scene (LayersStory, /company/about):
 * a multilayer PP-R pipe seen end-on. One ring (a layer of the pipe wall) per
 * chapter, outer → inner in reading order, and water in the bore at the end.
 *
 * Pure numbers only — no React — so the drawing, the server HTML and the unit
 * tests agree. Lengths are viewBox units of a square LAYERS_VIEWBOX; angles are
 * clockwise degrees from 12 o'clock.
 */

export const LAYERS_VIEWBOX = 320;
const CENTRE = LAYERS_VIEWBOX / 2;

/** Band width of one layer, and the hairline between two layers. */
export const RING_WIDTH = 18;
export const RING_GAP = 3;
/** Outer edge of the outermost layer: the pipe's outside wall. */
const OUTER_EDGE = 150;

/**
 * Where every ring starts drawing and closes: 1 o'clock. Labels sit centred
 * at 12 o'clock, just left of it, so a ring's band reaches its label last and
 * the label is never half on the band while the ring is drawing.
 */
export const SEAM_DEGREES = 30;
/** A ring runs this far past the seam, so a closed band overlaps itself
 * instead of leaving an antialiased hairline where its two ends meet. Bands
 * fade with element opacity, so the overlap is not painted twice as dark. */
const SEAM_OVERLAP_DEGREES = 1.5;

export const LABEL_FONT_SIZE = 13;
/** A textPath puts the baseline on the path; this drops it so the letters sit
 * in the middle of the band (about half the cap height). */
const LABEL_BASELINE_DROP = LABEL_FONT_SIZE * 0.35;
/** The label arc runs this far either side of 12 o'clock (room for any label). */
const LABEL_ARC_DEGREES = 60;
/** How far either side of 12 o'clock a label may reach and still clear the seam. */
const LABEL_MAX_DEGREES = SEAM_DEGREES - 4;
/** Average advance of a letter in the label face (Inter, semibold), in em.
 * Deliberately generous: it is only used to prove a label fits. */
const LABEL_EM_PER_CHAR = 0.64;

/** Stroke of the wave line, px (non-scaling, like the other line art). */
export const WAVE_STROKE = 1.5;

/** Where a beat starts and ends: the tracked element's top edge, as a fraction
 * of the viewport height from its top. */
export interface BeatLines {
  start: number;
  end: number;
}

/** Chapter beat: the chapter heading travels from 70% to 35% of the viewport
 * height. Ring `i` draws over its chapter's beat. */
export const CHAPTER_BEAT: BeatLines = { start: 0.7, end: 0.35 };
/** Finale beat: the finale block's top from 60% to 40% — it starts about when
 * the last ring closes (last heading at 35%, one chapter card higher). */
export const FINALE_BEAT: BeatLines = { start: 0.6, end: 0.4 };

function scrollOffset({ start, end }: BeatLines): UseScrollOptions["offset"] {
  return [`start ${start}` as const, `start ${end}` as const];
}

export const CHAPTER_BEAT_OFFSET: UseScrollOptions["offset"] = scrollOffset(CHAPTER_BEAT);
export const FINALE_BEAT_OFFSET: UseScrollOptions["offset"] = scrollOffset(FINALE_BEAT);

/** Completed rings settle to this opacity; the active ring is at 1. */
export const SETTLED_OPACITY = 0.4;
/** A ring settles while the next beat (next ring, or the water) runs 55% → 90%.
 * Beats overlap (a beat is 35% of the viewport, a chapter card is less), so
 * the next ring is already drawing when one closes; starting at 55% keeps a
 * ring fully active until it has closed whenever chapters are at least 16% of
 * the viewport apart. */
const SETTLE_RANGE: readonly [number, number] = [0.55, 0.9];
/** The share of a ring's draw during which its band slides under its label. */
const LABEL_LIT_RANGE: readonly [number, number] = [0.88, 0.98];
/** Over the finale beat: the bore fills first, then the wave line draws. */
const WATER_FILL_RANGE: readonly [number, number] = [0, 0.7];
const WAVE_RANGE: readonly [number, number] = [0.45, 1];

export interface Point {
  x: number;
  y: number;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** 0 → 1 as `value` crosses `range`, clamped. */
function progressIn(value: number, [from, to]: readonly [number, number]): number {
  return clamp01((value - from) / (to - from));
}

/** A point at `radius` and clockwise `degrees` from 12 o'clock. */
export function polar(radius: number, degrees: number, centre = CENTRE): Point {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: round(centre + radius * Math.cos(radians)), y: round(centre + radius * Math.sin(radians)) };
}

/** Centre-line radius of ring `index` (0 = outermost). */
export function ringRadius(index: number): number {
  return OUTER_EDGE - RING_WIDTH / 2 - index * (RING_WIDTH + RING_GAP);
}

/** Radius of the bore inside `count` rings: the water's full size. */
export function boreRadius(count: number): number {
  return OUTER_EDGE - count * (RING_WIDTH + RING_GAP);
}

/** Ring `index` as one clockwise turn from the seam back past the seam, so
 * `pathLength` 0 → 1 draws it the way the scene reads. */
export function ringPath(index: number): string {
  const r = ringRadius(index);
  const start = polar(r, SEAM_DEGREES);
  const half = polar(r, SEAM_DEGREES + 180);
  const end = polar(r, SEAM_DEGREES + 360 + SEAM_OVERLAP_DEGREES);
  return `M${start.x} ${start.y} A${r} ${r} 0 1 1 ${half.x} ${half.y} A${r} ${r} 0 1 1 ${end.x} ${end.y}`;
}

/** Baseline arc for ring `index`'s label: over the top, left to right, with
 * 12 o'clock at its midpoint (the label uses startOffset 50%). */
export function labelArcPath(index: number): string {
  const r = round(ringRadius(index) - LABEL_BASELINE_DROP);
  const from = polar(r, -LABEL_ARC_DEGREES);
  const to = polar(r, LABEL_ARC_DEGREES);
  return `M${from.x} ${from.y} A${r} ${r} 0 0 1 ${to.x} ${to.y}`;
}

/** The longest label ring `index` can carry without reaching the seam. */
export function labelMaxWidth(index: number): number {
  const r = ringRadius(index) - LABEL_BASELINE_DROP;
  return 2 * r * ((LABEL_MAX_DEGREES * Math.PI) / 180);
}

/** A conservative width estimate of a label, in viewBox units. */
export function estimateLabelWidth(label: string): number {
  return Array.from(label).length * LABEL_FONT_SIZE * LABEL_EM_PER_CHAR;
}

/** One horizontal wave through the centre of a bore of radius `bore`, drawn
 * left to right (two periods over 80% of the diameter), around (0, 0). */
export function wavePath(bore: number): string {
  const span = bore * 1.6;
  const step = round(span / 4);
  const rise = round(bore * 0.16);
  return `M${round(-span / 2)} 0 q${round(step / 2)} ${-rise} ${step} 0 t${step} 0 t${step} 0 t${step} 0`;
}

/**
 * How far a ring is drawn, given its own beat followed by every later beat
 * (later rings, then the finale). A ring is never behind a later beat: the
 * last chapter or the finale can stop short of their end line on a tall
 * screen, and reaching the finale must still leave every ring closed.
 */
export function ringDrawn(ownAndLater: readonly number[]): number {
  return clamp01(Math.max(0, ...ownAndLater));
}

/** 0 while a ring is the active one, 1 once it has settled. */
export function ringSettle(nextBeat: number): number {
  return progressIn(nextBeat, SETTLE_RANGE);
}

export function ringBandOpacity(settle: number): number {
  return 1 - (1 - SETTLED_OPACITY) * clamp01(settle);
}

/** Opacity of the on-accent label: lit once the band is under the label,
 * back off as the ring settles (the base label reads on a settled band). */
export function ringLabelOpacity(drawn: number, settle: number): number {
  return progressIn(drawn, LABEL_LIT_RANGE) * (1 - clamp01(settle));
}

/** Scale of the water in the bore, 0 → 1 over the finale beat. */
export function waterFill(finaleBeat: number): number {
  return progressIn(finaleBeat, WATER_FILL_RANGE);
}

/** How much of the wave line is drawn over the finale beat. */
export function waveDrawn(finaleBeat: number): number {
  return progressIn(finaleBeat, WAVE_RANGE);
}
