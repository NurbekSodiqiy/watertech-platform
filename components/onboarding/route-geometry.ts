import type { UseScrollOptions } from "framer-motion";

/**
 * Numbers of the "Marshrut" scene (RouteMap, /company/onboarding): a route
 * through one checkpoint per onboarding day, drawn up to where the reader is.
 *
 * Pure functions only — no React, no DOM — so the server HTML, the lazily
 * loaded scroll layer (RouteTrail) and the unit tests agree on one shape.
 *
 * The route is a chain of segments: a lead-in above the first checkpoint, one
 * segment from each checkpoint to the next, and a run-out from the last one to
 * the finish. The server renders every segment as its own small svg, stretched
 * over its box (connectorPath); the scroll layer measures those boxes and
 * joins the very same curves into one path (routeFromSegments), so both
 * layers draw an identical line.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Journey: where the reader is ─────────────────────────────────────────

export type CheckpointState = "done" | "current" | "upcoming";

export interface Journey {
  /** Days on the route. */
  readonly total: number;
  /** Days ticked off, in any order. */
  readonly done: number;
  /** Index of the first day not done yet — the "you are here" checkpoint;
   * null once every day is done. */
  readonly current: number | null;
  /** One per day, in day order. */
  readonly states: readonly CheckpointState[];
  /** How many segments, from the lead-in on, are drawn: up to the current
   * checkpoint, or all of them — through the finish — when every day is done. */
  readonly reached: number;
}

/** Segments of a route through `days` checkpoints: the lead-in, then one
 * leaving each checkpoint (the last one is the run-out to the finish). */
export function segmentCount(days: number): number {
  return days > 0 ? days + 1 : 0;
}

/**
 * Where the reader stands. Days may be ticked off out of order: "current" is
 * always the first one still open, and a later day that is done stays done.
 * Only `days` are counted, so a stored id that no longer matches a day can
 * never push the count past the total.
 */
export function journey(days: readonly number[], completed: readonly number[]): Journey {
  const finished = new Set(completed);
  const doneFlags = days.map((day) => finished.has(day));
  const firstOpen = doneFlags.indexOf(false);
  const current = firstOpen === -1 ? null : firstOpen;
  const states = doneFlags.map((isDone, index): CheckpointState =>
    isDone ? "done" : index === current ? "current" : "upcoming"
  );
  const total = days.length;
  return {
    total,
    done: doneFlags.filter(Boolean).length,
    current,
    states,
    reached: total === 0 ? 0 : (current ?? total) + 1,
  };
}

/** Whether segment `index` (0 = lead-in) is drawn for a journey that has `reached` segments. */
export function segmentDrawn(index: number, reached: number): boolean {
  return index >= 0 && index < reached;
}

// ── The route as the server renders it ───────────────────────────────────

/** "stacked": below md, one straight line on the left. "alternating": from md
 * up, day cards alternate left/right and the route sways between them. */
export type RouteLayout = "stacked" | "alternating";

/** x of a checkpoint as a share of the route column's width. Alternating:
 * a quarter in from the side of its card, so the line swings towards each
 * card in turn — a gentle S through all four. */
export const ROUTE_X: { readonly stacked: number; readonly left: number; readonly right: number } = {
  stacked: 0.5,
  left: 0.25,
  right: 0.75,
};

/** Day cards alternate: the first on the left, the second on the right… */
export function sideOf(index: number): "left" | "right" {
  return index % 2 === 0 ? "left" : "right";
}

export function checkpointX(index: number, layout: RouteLayout): number {
  return layout === "stacked" ? ROUTE_X.stacked : ROUTE_X[sideOf(index)];
}

export interface Connector {
  /** x where the segment starts and ends, as shares of its box's width. */
  readonly from: number;
  readonly to: number;
}

/** Every segment's horizontal course, lead-in first. The lead-in and the
 * run-out are straight; the rest swing from one checkpoint to the next. */
export function connectors(days: number, layout: RouteLayout): Connector[] {
  if (days <= 0) return [];
  const leadIn = { from: checkpointX(0, layout), to: checkpointX(0, layout) };
  const legs = Array.from({ length: days }, (_, index) => ({
    from: checkpointX(index, layout),
    to: checkpointX(Math.min(index + 1, days - 1), layout),
  }));
  return [leadIn, ...legs];
}

/**
 * Path data of one segment inside its svg's unit box (`viewBox="0 0 100 100"`,
 * stretched with `preserveAspectRatio="none"`, strokes non-scaling): from
 * (from, top) to (to, bottom), leaving and arriving vertically. Stretching a
 * cubic keeps it the same cubic in px, which is what routeFromSegments draws.
 */
export function connectorPath({ from, to }: Connector): string {
  const f = round(clamp01(from) * 100);
  const t = round(clamp01(to) * 100);
  return f === t ? `M${f} 0 V100` : `M${f} 0 C${f} 50 ${t} 50 ${t} 100`;
}

// ── The route as the scroll layer measures it ────────────────────────────

/** One segment's box, in px relative to the route container, with its course. */
export interface SegmentBox extends Connector {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface MeasuredRoute {
  /** One path through every segment, in the container's px. */
  readonly d: string;
  /** Where each segment ends: the checkpoints in order, then the finish. */
  readonly joints: readonly Point[];
}

/** Joins the measured segments into one path with the same curves the server
 * drew (connectorPath, scaled to each box). Null until something is laid out. */
export function routeFromSegments(boxes: readonly SegmentBox[]): MeasuredRoute | null {
  const laidOut = boxes.filter((box) => box.width > 0 && box.height > 0);
  if (laidOut.length === 0) return null;

  const joints: Point[] = [];
  let d = "";
  let cursor: Point | null = null;

  for (const box of laidOut) {
    const start = { x: box.left + clamp01(box.from) * box.width, y: box.top };
    const end = { x: box.left + clamp01(box.to) * box.width, y: box.top + box.height };
    const midY = box.top + box.height / 2;

    if (!cursor) d = `M${round(start.x)} ${round(start.y)}`;
    // Consecutive boxes meet at a checkpoint; bridge any sub-pixel rounding.
    else if (Math.abs(cursor.x - start.x) > 0.5 || Math.abs(cursor.y - start.y) > 0.5) d += ` L${round(start.x)} ${round(start.y)}`;

    d +=
      Math.abs(start.x - end.x) < 0.01
        ? ` L${round(end.x)} ${round(end.y)}`
        : ` C${round(start.x)} ${round(midY)} ${round(end.x)} ${round(midY)} ${round(end.x)} ${round(end.y)}`;
    joints.push(end);
    cursor = end;
  }

  return { d, joints };
}

/** Spacing of the getPointAtLength samples, px, and their bounds. */
export const SAMPLE_SPACING = 8;
export const MAX_SAMPLES = 400;

/** How many samples a route of `length` px gets: first and last point included. */
export function sampleCount(length: number): number {
  if (!(length > 0)) return 2;
  return Math.min(MAX_SAMPLES, Math.max(2, Math.ceil(length / SAMPLE_SPACING) + 1));
}

/**
 * Samples are points taken at equal steps of the path's own length
 * (getPointAtLength(i / (n − 1) · length)), so sample i sits at exactly
 * fraction i / (n − 1) of the path — the unit `pathLength` is drawn in.
 */
export type RouteSamples = readonly Point[];

/** The point at `fraction` (0 → 1) of the path's length, between two samples. */
export function pointAtFraction(samples: RouteSamples, fraction: number): Point {
  if (samples.length === 0) return { x: 0, y: 0 };
  if (samples.length === 1) return samples[0];
  const position = clamp01(fraction) * (samples.length - 1);
  const index = Math.min(Math.floor(position), samples.length - 2);
  const t = position - index;
  const a = samples[index];
  const b = samples[index + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * The fraction of the path's length at which it reaches height `y`. The route
 * only ever runs downwards (straight runs, and cubics whose y grows along the
 * whole curve), so each height is reached once. Clamped to the route's ends.
 */
export function fractionAtY(samples: RouteSamples, y: number): number {
  const count = samples.length;
  if (count < 2) return count === 1 && y >= samples[0].y ? 1 : 0;
  if (y <= samples[0].y) return 0;
  if (y >= samples[count - 1].y) return 1;

  // First sample at or below `y`.
  let lo = 1;
  let hi = count - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].y >= y) hi = mid;
    else lo = mid + 1;
  }
  const a = samples[lo - 1];
  const b = samples[lo];
  const t = b.y > a.y ? (y - a.y) / (b.y - a.y) : 1;
  return (lo - 1 + t) / (count - 1);
}

/** The fraction drawn when the reader has reached `reached` segments: the
 * end of the last reached one (the finish when all are reached). */
export function capFraction(samples: RouteSamples, joints: readonly Point[], reached: number): number {
  if (reached <= 0 || joints.length === 0) return 0;
  if (reached >= joints.length) return 1;
  return fractionAtY(samples, joints[reached - 1].y);
}

// ── Drawing with scroll ──────────────────────────────────────────────────

/** Scroll progress of the route: 0 when its top reaches two thirds of the way
 * down the viewport, 1 when its bottom reaches the viewport bottom — a point
 * the page can always scroll to, since only page padding follows the route.
 * The line's tip runs a little ahead of the reader's eye. */
export const ROUTE_SCROLL_OFFSET: UseScrollOptions["offset"] = ["start 0.66", "end end"];

/** The traveller fades in over the first and out over the last this much of the line. */
export const TRAVELLER_FADE = 0.01;

/**
 * What the reader had on screen when the scroll layer took over, as a height
 * inside the route: everything above the viewport's bottom edge. That part
 * stays drawn — the static drawing the server sent is never taken back while
 * someone can see it (the useRevealPhase contract, per pixel of line).
 */
export function visibleFloor(viewportHeight: number, routeTop: number): number {
  return Math.max(0, viewportHeight - routeTop);
}

export interface TrailInput {
  /** Scroll progress through ROUTE_SCROLL_OFFSET, 0 → 1. */
  readonly progress: number;
  /** Height of the route container, px. */
  readonly height: number;
  /** visibleFloor() at take-over. */
  readonly floor: number;
  /** capFraction() — how far the reader's real progress goes. */
  readonly cap: number;
}

/** The drawn fraction: as far down as the scroll (or what was already on
 * screen) has come, never past the reader's real progress. */
export function trailFraction(samples: RouteSamples, { progress, height, floor, cap }: TrailInput): number {
  const y = Math.max(floor, clamp01(progress) * height);
  return Math.min(clamp01(cap), fractionAtY(samples, y));
}

/**
 * The traveller rides the tip only while the reader leads it — the scroll,
 * or their progress where it stops the line. While the tip is merely the
 * take-over floor (the bottom edge of the first screen) it stays hidden,
 * and it fades out at both ends of the route.
 */
export function travellerOpacity(samples: RouteSamples, input: TrailInput): number {
  const fraction = trailFraction(samples, input);
  const led = clamp01(input.progress) * input.height >= input.floor || fraction >= clamp01(input.cap);
  if (!led) return 0;
  return clamp01(Math.min(fraction, 1 - fraction) / TRAVELLER_FADE);
}
