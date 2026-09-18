/**
 * Motion tokens — the only place durations, easings, springs and travel
 * distances are defined (CLAUDE.md §14). Components import these; no inline
 * magic numbers for `duration` / `ease`.
 *
 * Character: quiet, precise, physical. Short distances, confident easing,
 * nothing bounces (every spring is at least critically damped), nothing loops.
 */

export type CubicBezier = readonly [number, number, number, number];

export interface SpringPreset {
  readonly type: "spring";
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
  /** Distance from target (in the value's own units) at which the spring may settle. */
  readonly restDelta: number;
}

/** Seconds. */
export const durations: {
  readonly instant: number;
  readonly fast: number;
  readonly base: number;
  readonly slow: number;
} = {
  /** Direct feedback: page enter, dialog/backdrop, toast. */
  instant: 0.12,
  /** Panels and drawers that travel across the screen. */
  fast: 0.2,
  /** Reveals of headings and short text. */
  base: 0.32,
  /** One-shot showpieces (count-up, line drawing). Never on operator work pages. */
  slow: 0.6,
} as const;

export const easings: {
  readonly standard: CubicBezier;
  readonly exit: CubicBezier;
} = {
  /** Decelerating enter — fast start, long settle. */
  standard: [0.2, 0, 0, 1],
  /** Accelerating exit — leaves without lingering. */
  exit: [0.4, 0, 1, 1],
} as const;

export const springs: {
  readonly fluid: SpringPreset;
  readonly snappy: SpringPreset;
} = {
  /** Scroll-linked values: water-like inertia, overdamped (ζ≈1.87, τ≈0.19 s)
   * so it trails the scroll slightly and never overshoots. */
  fluid: { type: "spring", stiffness: 140, damping: 28, mass: 0.4, restDelta: 0.0005 },
  /** UI response (active pill, toggles): critically damped (ζ≈1.0), settles in ~0.25 s. */
  snappy: { type: "spring", stiffness: 500, damping: 45, mass: 1, restDelta: 0.5 },
} as const;

/** Pixels. Reveals travel a short distance only — never 20px or more. */
export const distances: {
  readonly nudge: number;
  readonly lift: number;
  readonly reveal: number;
} = {
  /** Page enter. */
  nudge: 4,
  /** Dialog panels settling into place. */
  lift: 8,
  /** Content revealed on scroll, toasts. */
  reveal: 12,
} as const;

/** Seconds. */
export const staggers: {
  readonly step: number;
  readonly maxCascade: number;
} = {
  /** Delay between siblings when the list is short. */
  step: 0.05,
  /** Upper bound for the whole cascade (first to last child start), regardless of child count. */
  maxCascade: 0.4,
} as const;

/** A tween built from tokens. */
export function tween(
  duration: number,
  ease: CubicBezier = easings.standard
): { readonly duration: number; readonly ease: CubicBezier } {
  return { duration, ease };
}

/** Reduced motion and instant state changes: no transition at all. */
export const noTransition: { readonly duration: 0 } = { duration: 0 };

/** Per-child stagger that keeps the whole cascade within `staggers.maxCascade`. */
export function staggerStep(count: number): number {
  if (!Number.isFinite(count) || count <= 1) return 0;
  return Math.min(staggers.step, staggers.maxCascade / (count - 1));
}

/** ζ = c / (2√(k·m)). ≥ 1 means the spring cannot overshoot. */
export function dampingRatio(spring: Pick<SpringPreset, "stiffness" | "damping" | "mass">): number {
  return spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
}

/** Whether an element's box intersects the viewport vertically. Used after
 * mount to decide if a reveal is worth arming: content the reader can already
 * see stays put instead of disappearing and animating back in. */
export function isInitiallyInView(rect: { top: number; bottom: number }, viewportHeight: number): boolean {
  return rect.bottom > 0 && rect.top < viewportHeight;
}
