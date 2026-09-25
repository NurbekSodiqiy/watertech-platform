import { describe, expect, it } from "vitest";
import {
  capFraction,
  checkpointX,
  connectorPath,
  connectors,
  fractionAtY,
  journey,
  MAX_SAMPLES,
  pointAtFraction,
  ROUTE_X,
  routeFromSegments,
  sampleCount,
  segmentCount,
  segmentDrawn,
  sideOf,
  trailFraction,
  travellerOpacity,
  visibleFloor,
  type Point,
  type RouteSamples,
  type SegmentBox,
} from "@/components/onboarding/route-geometry";

const DAYS = [1, 2, 3, 4];

function expectPoint(actual: Point, expected: Point, digits = 6): void {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
}

// ── A tiny interpreter for the path data routeFromSegments writes ─────────

type Piece =
  | { kind: "line"; from: Point; to: Point }
  | { kind: "cubic"; from: Point; c1: Point; c2: Point; to: Point };

function parsePath(d: string): Piece[] {
  const tokens = d.match(/[MLC]|-?\d+(?:\.\d+)?/g) ?? [];
  const pieces: Piece[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let i = 0;
  const num = (): number => Number(tokens[i++]);
  const point = (): Point => ({ x: num(), y: num() });
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === "M") cursor = point();
    else if (command === "L") {
      const to = point();
      pieces.push({ kind: "line", from: cursor, to });
      cursor = to;
    } else if (command === "C") {
      const c1 = point();
      const c2 = point();
      const to = point();
      pieces.push({ kind: "cubic", from: cursor, c1, c2, to });
      cursor = to;
    } else throw new Error(`unexpected token ${command}`);
  }
  return pieces;
}

function at(piece: Piece, t: number): Point {
  if (piece.kind === "line") {
    return { x: piece.from.x + (piece.to.x - piece.from.x) * t, y: piece.from.y + (piece.to.y - piece.from.y) * t };
  }
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const ps = [piece.from, piece.c1, piece.c2, piece.to];
  return {
    x: ps.reduce((sum, p, k) => sum + p.x * w[k], 0),
    y: ps.reduce((sum, p, k) => sum + p.y * w[k], 0),
  };
}

/** What getPointAtLength would hand back: points at equal steps of the path's
 * length, approximated here by a dense walk of the parsed pieces. */
function sampleEvenly(d: string, count: number): Point[] {
  const dense: Point[] = [];
  for (const piece of parsePath(d)) {
    for (let k = dense.length === 0 ? 0 : 1; k <= 400; k++) dense.push(at(piece, k / 400));
  }
  const lengths = [0];
  for (let k = 1; k < dense.length; k++) {
    lengths.push(lengths[k - 1] + Math.hypot(dense[k].x - dense[k - 1].x, dense[k].y - dense[k - 1].y));
  }
  const total = lengths[lengths.length - 1];
  return Array.from({ length: count }, (_, i) => {
    const target = (i / (count - 1)) * total;
    let k = 1;
    while (k < lengths.length - 1 && lengths[k] < target) k++;
    const span = lengths[k] - lengths[k - 1];
    const t = span > 0 ? (target - lengths[k - 1]) / span : 0;
    return {
      x: dense[k - 1].x + (dense[k].x - dense[k - 1].x) * t,
      y: dense[k - 1].y + (dense[k].y - dense[k - 1].y) * t,
    };
  });
}

// Mirrors the real CSS (RouteMap): a 96px route column from x=376 on a 848px
// page, rows 150px apart, checkpoints 28px below each row's top, a 24px gap,
// the lead-in from 24px above the first row, the run-out 24px past the last.
function desktopBoxes(): SegmentBox[] {
  const column = { left: 376, width: 96 };
  const rowTop = (index: number) => 24 + index * 174;
  const checkpointY = (index: number) => rowTop(index) + 28;
  return connectors(DAYS.length, "alternating").map((c, index) => {
    const top = index === 0 ? 0 : checkpointY(index - 1);
    const bottom = index === 0 ? checkpointY(0) : index < DAYS.length ? checkpointY(index) : rowTop(DAYS.length - 1) + 150 + 24;
    return { ...c, left: column.left, width: column.width, top, height: bottom - top };
  });
}

function mobileBoxes(): SegmentBox[] {
  return connectors(DAYS.length, "stacked").map((c, index) => ({
    ...c,
    left: 0,
    width: 40,
    top: index * 300,
    height: 300,
  }));
}

describe("journey", () => {
  it("puts a new hire at the first checkpoint with only the lead-in drawn", () => {
    expect(journey(DAYS, [])).toEqual({
      total: 4,
      done: 0,
      current: 0,
      states: ["current", "upcoming", "upcoming", "upcoming"],
      reached: 1,
    });
  });

  it("stands on the first open day, even when a later one is done", () => {
    const j = journey(DAYS, [1, 2, 4]);
    expect(j.current).toBe(2);
    expect(j.done).toBe(3);
    expect(j.states).toEqual(["done", "done", "current", "done"]);
    // Drawn up to checkpoint 3: lead-in, 1 → 2, 2 → 3.
    expect(j.reached).toBe(3);
  });

  it("draws through the finish once every day is done", () => {
    const j = journey(DAYS, [4, 3, 2, 1]);
    expect(j.current).toBeNull();
    expect(j.done).toBe(4);
    expect(j.states.every((s) => s === "done")).toBe(true);
    expect(j.reached).toBe(segmentCount(DAYS.length));
  });

  it("ignores completed values that match no day (stale storage)", () => {
    const j = journey(DAYS, [7, 0, 2, 2]);
    expect(j.done).toBe(1);
    expect(j.total).toBe(4);
    expect(j.current).toBe(0);
  });

  it("has nothing to draw without days", () => {
    expect(journey([], [1])).toEqual({ total: 0, done: 0, current: null, states: [], reached: 0 });
    expect(segmentCount(0)).toBe(0);
  });

  it("draws exactly the reached segments", () => {
    const { reached } = journey(DAYS, [1]);
    const drawn = Array.from({ length: segmentCount(4) }, (_, index) => segmentDrawn(index, reached));
    expect(drawn).toEqual([true, true, false, false, false]);
    expect(segmentDrawn(-1, reached)).toBe(false);
  });
});

describe("the server-rendered route", () => {
  it("alternates the cards, starting on the left", () => {
    expect(DAYS.map((_, index) => sideOf(index))).toEqual(["left", "right", "left", "right"]);
  });

  it("runs one straight line when stacked and swings between the sides when alternating", () => {
    expect(DAYS.map((_, index) => checkpointX(index, "stacked"))).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(DAYS.map((_, index) => checkpointX(index, "alternating"))).toEqual([
      ROUTE_X.left,
      ROUTE_X.right,
      ROUTE_X.left,
      ROUTE_X.right,
    ]);
  });

  it("lists the lead-in, one leg per checkpoint and a straight run-out", () => {
    expect(connectors(4, "alternating")).toEqual([
      { from: 0.25, to: 0.25 },
      { from: 0.25, to: 0.75 },
      { from: 0.75, to: 0.25 },
      { from: 0.25, to: 0.75 },
      { from: 0.75, to: 0.75 },
    ]);
    expect(connectors(4, "stacked").every((c) => c.from === 0.5 && c.to === 0.5)).toBe(true);
    expect(connectors(4, "stacked")).toHaveLength(segmentCount(4));
    expect(connectors(0, "stacked")).toEqual([]);
  });

  it("writes straight and S-shaped connectors in the unit box, vertical at both ends", () => {
    expect(connectorPath({ from: 0.5, to: 0.5 })).toBe("M50 0 V100");
    expect(connectorPath({ from: 0.25, to: 0.75 })).toBe("M25 0 C25 50 75 50 75 100");
    expect(connectorPath({ from: 0.75, to: 0.25 })).toBe("M75 0 C75 50 25 50 25 100");
    expect(connectorPath({ from: -1, to: 2 })).toBe("M0 0 C0 50 100 50 100 100");
  });
});

describe("routeFromSegments", () => {
  it("draws the server's curves, scaled to each measured box", () => {
    const boxes = desktopBoxes();
    const route = routeFromSegments(boxes);
    if (!route) throw new Error("expected a route");
    const pieces = parsePath(route.d);
    expect(pieces).toHaveLength(boxes.length);

    boxes.forEach((box, index) => {
      // The connector's own unit-box path, stretched over the box.
      const unit = parsePath(connectorPath(box).replace(/V100/, `L${box.from * 100} 100`))[0];
      const scale = (p: Point): Point => ({ x: box.left + (p.x / 100) * box.width, y: box.top + (p.y / 100) * box.height });
      const expected: Piece =
        unit.kind === "line"
          ? { kind: "line", from: scale(unit.from), to: scale(unit.to) }
          : { kind: "cubic", from: scale(unit.from), c1: scale(unit.c1), c2: scale(unit.c2), to: scale(unit.to) };
      for (const t of [0, 0.2, 0.5, 0.8, 1]) expectPoint(at(pieces[index], t), at(expected, t), 1);
    });
  });

  it("ends each segment at the next checkpoint and the last at the finish", () => {
    const boxes = desktopBoxes();
    const route = routeFromSegments(boxes);
    expect(route?.joints).toHaveLength(boxes.length);
    route?.joints.forEach((joint, index) => {
      const box = boxes[index];
      expectPoint(joint, { x: box.left + box.to * box.width, y: box.top + box.height });
    });
  });

  it("only ever runs downwards, so every height is reached once", () => {
    for (const boxes of [desktopBoxes(), mobileBoxes()]) {
      const route = routeFromSegments(boxes);
      if (!route) throw new Error("expected a route");
      let lastY = -Infinity;
      for (const piece of parsePath(route.d)) {
        for (let k = 1; k <= 50; k++) {
          const { y } = at(piece, k / 50);
          expect(y).toBeGreaterThan(lastY);
          lastY = y;
        }
      }
    }
  });

  it("is a straight line when stacked", () => {
    const route = routeFromSegments(mobileBoxes());
    expect(route?.d).toBe("M20 0 L20 300 L20 600 L20 900 L20 1200 L20 1500");
  });

  it("bridges a sub-pixel gap between boxes and skips boxes that are not laid out", () => {
    const route = routeFromSegments([
      { left: 0, top: 0, width: 40, height: 100, from: 0.5, to: 0.5 },
      { left: 0, top: 0, width: 0, height: 0, from: 0.5, to: 0.5 },
      { left: 0, top: 101, width: 40, height: 100, from: 0.5, to: 0.5 },
    ]);
    expect(route?.d).toBe("M20 0 L20 100 L20 101 L20 201");
    expect(route?.joints).toHaveLength(2);
    expect(routeFromSegments([])).toBeNull();
    expect(routeFromSegments([{ left: 0, top: 0, width: 0, height: 10, from: 0, to: 0 }])).toBeNull();
  });
});

describe("samples", () => {
  const line: RouteSamples = Array.from({ length: 11 }, (_, i) => ({ x: 20, y: i * 10 }));

  it("takes one sample per few px, within bounds", () => {
    expect(sampleCount(0)).toBe(2);
    expect(sampleCount(Number.NaN)).toBe(2);
    expect(sampleCount(80)).toBe(11);
    expect(sampleCount(1_000_000)).toBe(MAX_SAMPLES);
  });

  it("finds the point at a fraction of the length, clamped to the ends", () => {
    expectPoint(pointAtFraction(line, 0), { x: 20, y: 0 });
    expectPoint(pointAtFraction(line, 0.45), { x: 20, y: 45 });
    expectPoint(pointAtFraction(line, 1), { x: 20, y: 100 });
    expectPoint(pointAtFraction(line, 7), { x: 20, y: 100 });
    expectPoint(pointAtFraction(line, -1), { x: 20, y: 0 });
    expectPoint(pointAtFraction([], 0.5), { x: 0, y: 0 });
    expectPoint(pointAtFraction([{ x: 3, y: 4 }], 0.5), { x: 3, y: 4 });
  });

  it("finds the fraction at a height, clamped to the ends", () => {
    expect(fractionAtY(line, -5)).toBe(0);
    expect(fractionAtY(line, 0)).toBe(0);
    expect(fractionAtY(line, 45)).toBeCloseTo(0.45, 9);
    expect(fractionAtY(line, 100)).toBe(1);
    expect(fractionAtY(line, 500)).toBe(1);
    expect(fractionAtY([], 5)).toBe(0);
  });

  it("inverts pointAtFraction along the real S-shaped route", () => {
    const route = routeFromSegments(desktopBoxes());
    if (!route) throw new Error("expected a route");
    const samples = sampleEvenly(route.d, 200);
    for (const f of [0, 0.1, 0.33, 0.5, 0.77, 0.95, 1]) {
      expect(fractionAtY(samples, pointAtFraction(samples, f).y)).toBeCloseTo(f, 6);
    }
  });
});

describe("drawing up to the reader", () => {
  const route = routeFromSegments(desktopBoxes());
  if (!route) throw new Error("expected a route");
  const samples = sampleEvenly(route.d, 300);
  const height = route.joints[route.joints.length - 1].y;

  it("caps at the current checkpoint, and at the finish once all is done", () => {
    expect(capFraction(samples, route.joints, 0)).toBe(0);
    const atFirst = capFraction(samples, route.joints, journey(DAYS, []).reached);
    const atThird = capFraction(samples, route.joints, journey(DAYS, [1, 2]).reached);
    expectPoint(pointAtFraction(samples, atFirst), route.joints[0], 0);
    expectPoint(pointAtFraction(samples, atThird), route.joints[2], 0);
    expect(atThird).toBeGreaterThan(atFirst);
    expect(capFraction(samples, route.joints, journey(DAYS, DAYS).reached)).toBe(1);
    expect(capFraction(samples, [], 3)).toBe(0);
  });

  it("follows the scroll, never past the cap", () => {
    const cap = capFraction(samples, route.joints, 3);
    const early = trailFraction(samples, { progress: 0.1, height, floor: 0, cap });
    const late = trailFraction(samples, { progress: 0.9, height, floor: 0, cap });
    expect(early).toBeCloseTo(fractionAtY(samples, 0.1 * height), 9);
    expect(early).toBeLessThan(cap);
    expect(late).toBe(cap);
  });

  it("keeps what was on screen at take-over drawn when scrolling back up", () => {
    const floor = visibleFloor(900, 400);
    expect(floor).toBe(500);
    const drawn = trailFraction(samples, { progress: 0, height, floor, cap: 1 });
    expect(drawn).toBeCloseTo(fractionAtY(samples, 500), 9);
    // Never past the reader's progress, even for what was visible.
    expect(trailFraction(samples, { progress: 0, height, floor, cap: 0.1 })).toBe(0.1);
    // A route that starts below the fold keeps nothing.
    expect(visibleFloor(900, 1200)).toBe(0);
    expect(trailFraction(samples, { progress: 0, height, floor: 0, cap: 1 })).toBe(0);
  });

  it("shows the traveller only while the scroll or the reader's progress leads the tip", () => {
    // The tip on the take-over floor (bottom edge of the first screen): hidden.
    expect(travellerOpacity(samples, { progress: 0.05, height, floor: 500, cap: 1 })).toBe(0);
    // The scroll has passed the floor (0.9 × 720px > 500px): riding the tip.
    expect(travellerOpacity(samples, { progress: 0.9, height, floor: 500, cap: 1 })).toBe(1);
    // Stopped by the reader's progress, even above the floor: parked at the checkpoint.
    const cap = capFraction(samples, route.joints, 2);
    expect(travellerOpacity(samples, { progress: 0, height, floor: 500, cap })).toBe(1);
  });

  it("fades the traveller out at both ends of the route", () => {
    expect(travellerOpacity(samples, { progress: 0, height, floor: 0, cap: 1 })).toBe(0);
    expect(travellerOpacity(samples, { progress: 1, height, floor: 0, cap: 1 })).toBe(0);
    // Parked by the reader's progress half-way into the fade.
    const nearStart = travellerOpacity(samples, { progress: 1, height, floor: 0, cap: 0.005 });
    expect(nearStart).toBeCloseTo(0.5, 6);
  });
});
