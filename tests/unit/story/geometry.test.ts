import { describe, expect, it } from "vitest";
import {
  BEND_RADIUS,
  BRANCH_MIN_TRAVEL,
  buildPipeline,
  buildRoute,
  lengthToPoint,
  MIN_TANK_SHARE,
  pointAtLength,
  type PipelineGeometry,
  type PipelineMeasurements,
  type Point,
} from "@/components/story/geometry";

const QUARTER = Math.PI / 2;

function expectPoint(actual: Point, expected: Point): void {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

function built(m: PipelineMeasurements): PipelineGeometry {
  const geometry = buildPipeline(m);
  if (!geometry) throw new Error("expected a geometry");
  return geometry;
}

// Mirrors the real CSS: story 800px wide on desktop (centre line, cards in
// two columns with a 112px gutter, 48px fittings), 327px on a 375px phone
// (rail at x=20, cards from x=56, 40px fittings), tank in the right column.
const DESKTOP: PipelineMeasurements = {
  width: 800,
  height: 1400,
  lineX: 400,
  fittings: [
    { y: 62, radius: 24, branchToX: 456 },
    { y: 362, radius: 24, branchToX: 344 },
    { y: 662, radius: 24, branchToX: 456 },
    { y: 962, radius: 24, branchToX: 344 },
  ],
  inlet: { x: 504, y: 1318 },
};

const MOBILE: PipelineMeasurements = {
  width: 327,
  height: 1900,
  lineX: 20,
  fittings: [
    { y: 58, radius: 20, branchToX: 56 },
    { y: 480, radius: 20, branchToX: 56 },
    { y: 900, radius: 20, branchToX: 56 },
    { y: 1320, radius: 20, branchToX: 56 },
  ],
  inlet: { x: 96, y: 1832 },
};

describe("buildRoute", () => {
  it("draws a straight run as one line of its own length", () => {
    const route = buildRoute([{ x: 10, y: 0 }, { x: 10, y: 100 }], 16);
    expect(route.segments).toHaveLength(1);
    expect(route.length).toBe(100);
    expect(route.d).toBe("M10 0 L10 100");
  });

  it("rounds a corner with a quarter arc and shortens both runs by the radius", () => {
    const route = buildRoute([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 60, y: 100 }], 16);
    expect(route.segments.map((s) => s.kind)).toEqual(["line", "arc", "line"]);
    expect(route.segments[0].length).toBeCloseTo(84, 6);
    expect(route.segments[1].length).toBeCloseTo(16 * QUARTER, 6);
    expect(route.segments[2].length).toBeCloseTo(44, 6);
    expect(route.length).toBeCloseTo(100 - 16 + 16 * QUARTER + 60 - 16, 6);
    // Down then right is a counter-clockwise turn on screen.
    expect(route.d).toBe("M0 0 L0 84 A16 16 0 0 0 16 100 L60 100");
  });

  it("uses the clockwise sweep for a right-then-down turn", () => {
    const route = buildRoute([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }], 16);
    expect(route.d).toBe("M0 0 L34 0 A16 16 0 0 1 50 16 L50 50");
  });

  it("segment lengths always sum to the route length", () => {
    const route = buildRoute(
      [{ x: 0, y: 0 }, { x: 0, y: 200 }, { x: 90, y: 200 }, { x: 90, y: 260 }, { x: 10, y: 260 }],
      16
    );
    const sum = route.segments.reduce((total, s) => total + s.length, 0);
    expect(route.length).toBeCloseTo(sum, 9);
    expect(route.segments.filter((s) => s.kind === "arc")).toHaveLength(3);
  });

  it("shrinks the radius to half of a short neighbouring run", () => {
    const route = buildRoute([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 10, y: 100 }], 16);
    const arc = route.segments.find((s) => s.kind === "arc");
    expect(arc?.kind === "arc" ? arc.radius : null).toBe(5);
  });

  it("merges collinear and repeated points instead of drawing zero arcs", () => {
    const route = buildRoute([{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 0, y: 40 }, { x: 0, y: 100 }], 16);
    expect(route.segments).toHaveLength(1);
    expect(route.length).toBe(100);
  });

  it("handles degenerate input", () => {
    expect(buildRoute([], 16)).toEqual({ segments: [], length: 0, d: "" });
    expect(buildRoute([{ x: 3, y: 4 }], 16)).toEqual({ segments: [], length: 0, d: "M3 4" });
  });

  it("rejects diagonal runs and reversals", () => {
    expect(() => buildRoute([{ x: 0, y: 0 }, { x: 10, y: 10 }], 16)).toThrow();
    expect(() => buildRoute([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 0, y: 20 }], 16)).toThrow();
  });
});

describe("pointAtLength / lengthToPoint", () => {
  const route = buildRoute([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 60, y: 100 }], 16);

  it("walks straight runs and arcs", () => {
    expectPoint(pointAtLength(route, 0), { x: 0, y: 0 });
    expectPoint(pointAtLength(route, 50), { x: 0, y: 50 });
    // Halfway round the arc: 45° about its centre (16, 84).
    const mid = 84 + (16 * QUARTER) / 2;
    expectPoint(pointAtLength(route, mid), { x: 16 - 16 * Math.cos(Math.PI / 4), y: 84 + 16 * Math.sin(Math.PI / 4) });
    expectPoint(pointAtLength(route, 84 + 16 * QUARTER), { x: 16, y: 100 });
    expectPoint(pointAtLength(route, route.length), { x: 60, y: 100 });
  });

  it("clamps outside the route", () => {
    expectPoint(pointAtLength(route, -10), { x: 0, y: 0 });
    expectPoint(pointAtLength(route, route.length + 10), { x: 60, y: 100 });
  });

  it("is the inverse of pointAtLength on straight runs", () => {
    for (const s of [0, 30, 84, 84 + 16 * QUARTER + 10, route.length]) {
      expect(lengthToPoint(route, pointAtLength(route, s))).toBeCloseTo(s, 6);
    }
  });
});

describe("buildPipeline — desktop (centre line)", () => {
  const g = built(DESKTOP);

  it("runs from the top of the centre line into the tank inlet with two bends", () => {
    expectPoint(pointAtLength(g.main, 0), { x: 400, y: 0 });
    expectPoint(pointAtLength(g.main, g.main.length), DESKTOP.inlet ?? { x: 0, y: 0 });
    expect(g.main.segments.filter((s) => s.kind === "arc")).toHaveLength(2);
    // Vertical drop + horizontal jog, each corner trading 2r of straight for an arc.
    const expected = 1318 + 104 - 4 * BEND_RADIUS + 2 * BEND_RADIUS * QUARTER;
    expect(g.main.length).toBeCloseTo(expected, 6);
  });

  it("seats fittings in reading order, at their share of the line, before the tank", () => {
    const seats = g.fittings.map((f) => f.seatAt);
    expect([...seats].sort((a, b) => a - b)).toEqual(seats);
    DESKTOP.fittings.forEach((f, i) => {
      expect(seats[i]).toBeCloseTo((f.y / g.main.length) * g.lineEnd, 9);
    });
    expect(seats[0]).toBeGreaterThan(0);
    expect(seats[seats.length - 1]).toBeLessThan(g.lineEnd);
    expect(g.lineEnd).toBeLessThan(1);
  });

  it("alternates branches right and left, from the fitting rim to the card edge", () => {
    expect(g.fittings.map((f) => f.branch?.d)).toEqual([
      "M424 62 H456",
      "M376 362 H344",
      "M424 662 H456",
      "M376 962 H344",
    ]);
    expect(g.fittings.every((f) => f.branch?.length === 32)).toBe(true);
  });

  it("fills each branch after its fitting seats, at the water's speed", () => {
    for (const f of g.fittings) {
      expect(f.filledAt).toBeGreaterThan(f.seatAt);
      expect(f.filledAt - f.seatAt).toBeCloseTo((BRANCH_MIN_TRAVEL / g.main.length) * g.lineEnd, 9);
    }
  });

  it("gives the tank at least MIN_TANK_SHARE of the progress", () => {
    // The tank is small next to the story, so the minimum applies.
    expect(1 - g.lineEnd).toBeCloseTo(MIN_TANK_SHARE, 9);
    const tall = built({ ...DESKTOP, height: 1600, inlet: { x: 504, y: 1100 } });
    expect(tall.lineEnd).toBeCloseTo(1100 / 1600, 9);
  });
});

describe("buildPipeline — mobile (left rail)", () => {
  const g = built(MOBILE);

  it("sends every branch to the right, short", () => {
    for (const f of g.fittings) {
      expect(f.branch?.d.startsWith("M40 ")).toBe(true);
      expect(f.branch?.length).toBe(16);
    }
  });

  it("keeps the bends: the rail jogs right into the tank", () => {
    expect(g.main.segments.filter((s) => s.kind === "arc")).toHaveLength(2);
    expectPoint(pointAtLength(g.main, g.main.length), { x: 96, y: 1832 });
    // The jog runs just above the tank, below the last fitting.
    const run = g.main.segments.find((s) => s.kind === "line" && s.from.y === s.to.y);
    expect(run?.from.y).toBe(1832 - 2 * BEND_RADIUS);
  });

  it("stretches short branches over BRANCH_MIN_TRAVEL of the line", () => {
    for (const f of g.fittings) {
      expect(f.filledAt - f.seatAt).toBeCloseTo((BRANCH_MIN_TRAVEL / g.main.length) * g.lineEnd, 9);
    }
  });
});

describe("buildPipeline — edge cases", () => {
  it("draws the line into the tank with zero chapters", () => {
    const g = built({ ...DESKTOP, fittings: [] });
    expect(g.fittings).toEqual([]);
    expect(g.main.length).toBeGreaterThan(0);
    expect(g.lineEnd).toBeGreaterThan(0);
    expect(g.lineEnd).toBeLessThan(1);
  });

  it("handles a single chapter", () => {
    const g = built({ ...MOBILE, fittings: [MOBILE.fittings[0]] });
    expect(g.fittings).toHaveLength(1);
    expect(g.fittings[0].seatAt).toBeCloseTo((58 / g.main.length) * g.lineEnd, 9);
    expect(g.fittings[0].filledAt).toBeGreaterThan(g.fittings[0].seatAt);
  });

  it("goes straight down when the tank sits on the line", () => {
    const g = built({ ...DESKTOP, inlet: { x: 400, y: 1318 } });
    expect(g.main.segments).toHaveLength(1);
    expect(g.main.d).toBe("M400 0 L400 1318");
  });

  it("fills over the whole progress when there is no tank", () => {
    const g = built({ ...DESKTOP, inlet: null });
    expect(g.lineEnd).toBe(1);
    expect(g.main.d).toBe("M400 0 L400 1400");
    expect(g.fittings[0].seatAt).toBeCloseTo(62 / 1400, 9);
  });

  it("skips a branch when the card leaves no room for one", () => {
    const g = built({ ...DESKTOP, fittings: [{ y: 62, radius: 24, branchToX: 410 }] });
    expect(g.fittings[0].branch).toBeNull();
    expect(g.fittings[0].filledAt).toBeGreaterThan(g.fittings[0].seatAt);
  });

  it("returns null before the container is laid out", () => {
    expect(buildPipeline({ ...DESKTOP, width: 0 })).toBeNull();
    expect(buildPipeline({ ...DESKTOP, height: 0, fittings: [], inlet: null })).toBeNull();
  });
});
