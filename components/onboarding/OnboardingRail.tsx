"use client";

import { m, useReducedMotion } from "framer-motion";
import { durations, noTransition, springs, tween, unitless } from "@/lib/motion/tokens";

/** Stroke widths, px — the same three-stroke pipe as PipelineStory: a body, a
 * bore, and water filling the bore. */
const PIPE_BODY = 10;
const PIPE_BORE = 6;
const WATER = 6;

/** The svg is 12 units wide and stretched to whatever height the rail gets
 * (preserveAspectRatio="none"). A vertical stroke's width depends only on the
 * horizontal scale, which stays 1:1, so the pipe keeps its width at any height.
 * Butt caps: round ones would be stretched too, and the nodes cover the ends. */
const PIPE_D = "M6 0 V100";

const WATER_TRANSITION = { pathLength: unitless(springs.fluid), opacity: tween(durations.instant) };

/**
 * The completion rail of the onboarding checklist: water level = `progress`
 * (0 → 1), driven by what has been ticked off, not by scrolling. It springs to
 * a new level with the `fluid` preset and jumps there under reduced motion.
 * (DrawPath's progress mode is scroll-linked and shows the finished path under
 * reduced motion, which would read as "all done" — so the water is drawn here.)
 */
export function OnboardingRail({ progress, className = "" }: { progress: number; className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <g fill="none">
        <path d={PIPE_D} strokeWidth={PIPE_BODY} className="stroke-border" />
        <path d={PIPE_D} strokeWidth={PIPE_BORE} className="stroke-surface" />
      </g>
      <m.path
        d={PIPE_D}
        fill="none"
        strokeWidth={WATER}
        className="stroke-accent"
        initial={false}
        // Opacity hides the dot a zero-length stroke would otherwise leave.
        animate={{ pathLength: progress, opacity: progress > 0 ? 1 : 0 }}
        transition={reduce ? noTransition : WATER_TRANSITION}
      />
    </svg>
  );
}
