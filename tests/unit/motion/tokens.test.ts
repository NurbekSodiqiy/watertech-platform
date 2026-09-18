import { describe, expect, it } from "vitest";
import {
  dampingRatio,
  distances,
  durations,
  easings,
  isInitiallyInView,
  noTransition,
  springs,
  staggerStep,
  staggers,
  tween,
} from "@/lib/motion/tokens";

describe("motion tokens", () => {
  it("defines the agreed durations, shortest to longest", () => {
    expect(durations).toEqual({ instant: 0.12, fast: 0.2, base: 0.32, slow: 0.6 });
    const ordered = [durations.instant, durations.fast, durations.base, durations.slow];
    expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
  });

  it("defines cubic-bezier easings with x control points inside [0, 1]", () => {
    expect(easings.standard).toEqual([0.2, 0, 0, 1]);
    expect(easings.exit).toEqual([0.4, 0, 1, 1]);
    for (const curve of Object.values(easings)) {
      expect(curve).toHaveLength(4);
      expect(curve[0]).toBeGreaterThanOrEqual(0);
      expect(curve[0]).toBeLessThanOrEqual(1);
      expect(curve[2]).toBeGreaterThanOrEqual(0);
      expect(curve[2]).toBeLessThanOrEqual(1);
    }
  });

  it("uses springs that never overshoot (damping ratio >= 1)", () => {
    for (const spring of Object.values(springs)) {
      expect(spring.type).toBe("spring");
      expect(dampingRatio(spring)).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the fluid spring softer than the snappy one", () => {
    const naturalFrequency = (s: { stiffness: number; mass: number }) => Math.sqrt(s.stiffness / s.mass);
    expect(naturalFrequency(springs.fluid)).toBeLessThan(naturalFrequency(springs.snappy));
  });

  it("keeps travel distances short", () => {
    expect(distances.reveal).toBeGreaterThanOrEqual(8);
    expect(distances.reveal).toBeLessThanOrEqual(12);
    for (const px of Object.values(distances)) {
      expect(px).toBeGreaterThan(0);
      expect(px).toBeLessThan(20);
    }
  });

  it("builds tweens from tokens", () => {
    expect(tween(durations.fast)).toEqual({ duration: 0.2, ease: easings.standard });
    expect(tween(durations.instant, easings.exit)).toEqual({ duration: 0.12, ease: easings.exit });
    expect(noTransition).toEqual({ duration: 0 });
  });
});

describe("staggerStep", () => {
  it("is zero for zero or one child", () => {
    expect(staggerStep(0)).toBe(0);
    expect(staggerStep(1)).toBe(0);
    expect(staggerStep(Number.NaN)).toBe(0);
  });

  it("uses the full step for short lists", () => {
    expect(staggerStep(3)).toBe(staggers.step);
  });

  it("never lets the cascade exceed the cap, whatever the child count", () => {
    for (const count of [2, 5, 9, 10, 25, 100, 1000]) {
      const cascade = staggerStep(count) * (count - 1);
      expect(cascade).toBeLessThanOrEqual(staggers.maxCascade + 1e-9);
    }
    expect(staggers.maxCascade).toBeLessThanOrEqual(0.4);
  });
});

describe("isInitiallyInView", () => {
  const vh = 800;

  it("is true for a box inside or straddling the viewport", () => {
    expect(isInitiallyInView({ top: 100, bottom: 200 }, vh)).toBe(true);
    expect(isInitiallyInView({ top: 750, bottom: 900 }, vh)).toBe(true);
    expect(isInitiallyInView({ top: -50, bottom: 20 }, vh)).toBe(true);
  });

  it("is false for a box below the fold or scrolled past", () => {
    expect(isInitiallyInView({ top: 800, bottom: 900 }, vh)).toBe(false);
    expect(isInitiallyInView({ top: 1200, bottom: 1300 }, vh)).toBe(false);
    expect(isInitiallyInView({ top: -300, bottom: 0 }, vh)).toBe(false);
  });
});
