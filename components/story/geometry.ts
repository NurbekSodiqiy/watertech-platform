/**
 * Pure geometry for the pipeline scroll scene (PipelineStory). No DOM: the
 * scene measures its chapters, hands the numbers to buildPipeline(), and gets
 * back path strings plus the progress values at which things happen.
 *
 * A route is a polyline of orthogonal runs whose corners are rounded with
 * quarter-circle arcs, so every length is known exactly: straight runs are
 * distances, arcs are πr/2. Nothing here ever samples a path.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LineSegment {
  readonly kind: "line";
  readonly from: Point;
  readonly to: Point;
  readonly length: number;
}

export interface ArcSegment {
  readonly kind: "arc";
  readonly from: Point;
  readonly to: Point;
  /** The corner the arc rounds off. */
  readonly corner: Point;
  /** Unit directions of travel into and out of the corner. */
  readonly dirIn: Point;
  readonly dirOut: Point;
  readonly radius: number;
  /** SVG sweep flag: 1 turns clockwise on screen (y down). */
  readonly sweep: 0 | 1;
  readonly length: number;
}

export type Segment = LineSegment | ArcSegment;

export interface Route {
  readonly segments: readonly Segment[];
  readonly length: number;
  /** SVG path data, in the same px units as the input points. */
  readonly d: string;
}

/** Corner radius of every bend, px. */
export const BEND_RADIUS = 16;

/** Smallest share of scroll progress the tank finale gets, so its level rises
 * over a noticeable stretch even when the tank is small next to the story. */
export const MIN_TANK_SHARE = 0.12;

/** A branch fills while the water front advances this many px along the main
 * line, or the branch's own length if that is longer — short mobile branches
 * would otherwise fill in a couple of pixels of scroll. */
export const BRANCH_MIN_TRAVEL = 48;

const EPSILON = 1e-6;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function direction(from: Point, to: Point): Point {
  const length = distance(from, to);
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function offset(p: Point, dir: Point, by: number): Point {
  return { x: p.x + dir.x * by, y: p.y + dir.y * by };
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

/** Drops repeated points and points in the middle of a straight run. */
function simplify(points: readonly Point[]): Point[] {
  const deduped = points.filter((p, i) => i === 0 || !samePoint(p, points[i - 1]));
  return deduped.filter((p, i) => {
    if (i === 0 || i === deduped.length - 1) return true;
    const a = direction(deduped[i - 1], p);
    const b = direction(p, deduped[i + 1]);
    return Math.abs(a.x - b.x) > EPSILON || Math.abs(a.y - b.y) > EPSILON;
  });
}

function assertOrthogonal(points: readonly Point[]): void {
  for (let i = 1; i < points.length; i++) {
    const dx = Math.abs(points[i].x - points[i - 1].x);
    const dy = Math.abs(points[i].y - points[i - 1].y);
    if (dx > EPSILON && dy > EPSILON) {
      throw new Error(`Route runs must be horizontal or vertical (point ${i}).`);
    }
  }
}

function lineSegment(from: Point, to: Point): LineSegment {
  return { kind: "line", from, to, length: distance(from, to) };
}

function toPathData(segments: readonly Segment[]): string {
  if (segments.length === 0) return "";
  const start = segments[0].from;
  let d = `M${round(start.x)} ${round(start.y)}`;
  for (const s of segments) {
    d +=
      s.kind === "line"
        ? ` L${round(s.to.x)} ${round(s.to.y)}`
        : ` A${round(s.radius)} ${round(s.radius)} 0 0 ${s.sweep} ${round(s.to.x)} ${round(s.to.y)}`;
  }
  return d;
}

/**
 * Builds a route through orthogonal waypoints, rounding each corner with a
 * quarter arc of `radius` — or less where a neighbouring run is too short to
 * fit it (at most half of either run, so adjacent arcs never overlap).
 * Reversals (a run doubling back on itself) are not supported.
 */
export function buildRoute(points: readonly Point[], radius: number): Route {
  const pts = simplify(points);
  assertOrthogonal(pts);
  if (pts.length < 2) return { segments: [], length: 0, d: pts.length === 1 ? `M${round(pts[0].x)} ${round(pts[0].y)}` : "" };

  const segments: Segment[] = [];
  let cursor = pts[0];

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const corner = pts[i];
    const next = pts[i + 1];
    const dirIn = direction(prev, corner);
    const dirOut = direction(corner, next);
    if (Math.abs(dirIn.x * dirOut.x + dirIn.y * dirOut.y) > EPSILON) {
      throw new Error(`Route doubles back on itself at point ${i}.`);
    }
    const r = Math.max(0, Math.min(radius, distance(prev, corner) / 2, distance(corner, next) / 2));
    const arcStart = offset(corner, dirIn, -r);
    const arcEnd = offset(corner, dirOut, r);

    if (distance(cursor, arcStart) > EPSILON) segments.push(lineSegment(cursor, arcStart));
    if (r > EPSILON) {
      const cross = dirIn.x * dirOut.y - dirIn.y * dirOut.x;
      segments.push({
        kind: "arc",
        from: arcStart,
        to: arcEnd,
        corner,
        dirIn,
        dirOut,
        radius: r,
        sweep: cross > 0 ? 1 : 0,
        length: (Math.PI / 2) * r,
      });
    }
    cursor = arcEnd;
  }

  const last = pts[pts.length - 1];
  if (distance(cursor, last) > EPSILON) segments.push(lineSegment(cursor, last));

  const length = segments.reduce((sum, s) => sum + s.length, 0);
  return { segments, length, d: toPathData(segments) };
}

function pointOnSegment(s: Segment, along: number): Point {
  const t = s.length === 0 ? 0 : Math.min(1, Math.max(0, along / s.length));
  if (s.kind === "line") {
    return { x: s.from.x + (s.to.x - s.from.x) * t, y: s.from.y + (s.to.y - s.from.y) * t };
  }
  // The arc's centre sits one radius inside the corner along both directions;
  // walking θ from 0 to π/2 moves from `from` (centre − dirOut·r) to `to`
  // (centre + dirIn·r).
  const theta = (t * Math.PI) / 2;
  const centre = offset(offset(s.corner, s.dirIn, -s.radius), s.dirOut, s.radius);
  return {
    x: centre.x - s.dirOut.x * s.radius * Math.cos(theta) + s.dirIn.x * s.radius * Math.sin(theta),
    y: centre.y - s.dirOut.y * s.radius * Math.cos(theta) + s.dirIn.y * s.radius * Math.sin(theta),
  };
}

/** The point `length` px along the route (clamped to its ends). */
export function pointAtLength(route: Route, length: number): Point {
  const { segments } = route;
  if (segments.length === 0) return { x: 0, y: 0 };
  let remaining = Math.max(0, length);
  for (const s of segments) {
    if (remaining <= s.length) return pointOnSegment(s, remaining);
    remaining -= s.length;
  }
  return segments[segments.length - 1].to;
}

/** Length along the route to the point on its straight runs nearest `p`. */
export function lengthToPoint(route: Route, p: Point): number {
  let best = { gap: Infinity, length: 0 };
  let travelled = 0;
  for (const s of route.segments) {
    if (s.kind === "line" && s.length > 0) {
      const dir = direction(s.from, s.to);
      const along = Math.min(s.length, Math.max(0, (p.x - s.from.x) * dir.x + (p.y - s.from.y) * dir.y));
      const gap = distance(p, offset(s.from, dir, along));
      if (gap < best.gap - EPSILON) best = { gap, length: travelled + along };
    }
    travelled += s.length;
  }
  return best.length;
}

/** What the scene reads from the DOM, in px relative to its container. */
export interface PipelineMeasurements {
  readonly width: number;
  readonly height: number;
  /** x of the main run: the centre line (≥ md) or the left rail (< md). */
  readonly lineX: number;
  /** One per chapter, in DOM order. */
  readonly fittings: readonly {
    /** Centre of the fitting on the main run. */
    readonly y: number;
    /** Half the fitting's width; its branch starts at this distance from the line. */
    readonly radius: number;
    /** x of the chapter card's edge facing the line; the branch ends here. */
    readonly branchToX: number;
  }[];
  /** Top of the tank's inlet, or null when the story has no tank. */
  readonly inlet: Point | null;
}

export interface FittingGeometry {
  /** Progress at which the water front reaches this fitting. */
  readonly seatAt: number;
  /** Branch pipe from the fitting's rim to its card, or null if there is no room for one. */
  readonly branch: { readonly d: string; readonly length: number } | null;
  /** Progress at which the branch is full; always > seatAt. */
  readonly filledAt: number;
}

export interface PipelineGeometry {
  readonly width: number;
  readonly height: number;
  readonly main: Route;
  readonly fittings: readonly FittingGeometry[];
  /** Progress at which the water reaches the tank inlet; the tank fills over [lineEnd, 1]. */
  readonly lineEnd: number;
}

/**
 * The main run starts at the top of the container on `lineX`, passes every
 * fitting, and ends in the tank. When the tank sits off the line, the pipe
 * jogs over to it just above the inlet with two bends.
 */
function mainRoutePoints(m: PipelineMeasurements, radius: number): Point[] {
  const start = { x: m.lineX, y: 0 };
  if (!m.inlet) return [start, { x: m.lineX, y: m.height }];
  if (Math.abs(m.inlet.x - m.lineX) < 0.5) return [start, { x: m.lineX, y: m.inlet.y }];

  const lowestFitting = m.fittings.reduce((max, f) => Math.max(max, f.y + f.radius), 0);
  const runY = Math.min(m.inlet.y, Math.max(m.inlet.y - 2 * radius, lowestFitting));
  return [start, { x: m.lineX, y: runY }, { x: m.inlet.x, y: runY }, m.inlet];
}

/** Returns null when the container has not been laid out (zero size). */
export function buildPipeline(m: PipelineMeasurements, radius: number = BEND_RADIUS): PipelineGeometry | null {
  if (m.width <= 0 || m.height <= 0) return null;

  const main = buildRoute(mainRoutePoints(m, radius), radius);
  if (main.length <= 0) return null;

  const tankShare = m.inlet ? Math.max(MIN_TANK_SHARE, (m.height - m.inlet.y) / m.height) : 0;
  const lineEnd = Math.min(1, Math.max(0, 1 - tankShare));
  // Progress per px of main line: the water front moves at one speed everywhere.
  const perPx = lineEnd / main.length;

  const fittings = m.fittings.map((f): FittingGeometry => {
    const seatAt = lengthToPoint(main, { x: m.lineX, y: f.y }) * perPx;
    const side = Math.sign(f.branchToX - m.lineX);
    const fromX = m.lineX + side * f.radius;
    const length = side === 0 ? 0 : Math.max(0, (f.branchToX - fromX) * side);
    const branch = length >= 1 ? { d: `M${round(fromX)} ${round(f.y)} H${round(f.branchToX)}`, length } : null;
    const filledAt = seatAt + Math.max(Math.max(length, BRANCH_MIN_TRAVEL) * perPx, EPSILON);
    return { seatAt, branch, filledAt };
  });

  return { width: m.width, height: m.height, main, fittings, lineEnd };
}
