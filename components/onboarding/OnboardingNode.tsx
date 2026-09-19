"use client";

import { m, useReducedMotion } from "framer-motion";
import { FittingGlyph, type FittingKind } from "@/components/story/fittings";
import { durations, noTransition, springs, tween, unitless } from "@/lib/motion/tokens";

/** Same as PipelineChapter: a fitting sits slightly small until it seats. */
const DRY_SCALE = 0.92;
const SEAT_SPRING = unitless(springs.snappy);
const CROSSFADE = tween(durations.fast);

/**
 * One day's fitting on the completion rail. Dry and seated looks are two
 * stacked layers, so seating is an opacity crossfade plus a scale — no colour
 * animation. Absolutely placed at the left edge of its (relative) day row, from
 * md up; the rail behind it is hidden below md.
 */
export function OnboardingNode({ kind, seated }: { kind: FittingKind; seated: boolean }) {
  const reduce = useReducedMotion();

  return (
    <m.span
      aria-hidden="true"
      className="absolute -left-16 top-5 hidden h-10 w-10 md:block"
      initial={false}
      animate={{ scale: seated ? 1 : DRY_SCALE }}
      transition={reduce ? noTransition : SEAT_SPRING}
    >
      <span className="absolute inset-0 rounded-full border border-border bg-surface text-text-secondary">
        <FittingGlyph kind={kind} className="h-full w-full" />
      </span>
      <m.span
        className="absolute inset-0 overflow-hidden rounded-full border border-accent/40 bg-surface text-accent"
        initial={false}
        animate={{ opacity: seated ? 1 : 0 }}
        transition={reduce ? noTransition : CROSSFADE}
      >
        <span className="absolute inset-0 bg-accent/10" />
        <FittingGlyph kind={kind} className="relative h-full w-full" />
      </m.span>
    </m.span>
  );
}
