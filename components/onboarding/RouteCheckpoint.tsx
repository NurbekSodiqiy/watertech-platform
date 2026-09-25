"use client";

import { Check } from "lucide-react";
import { m, useReducedMotion } from "framer-motion";
import type { CheckpointState } from "@/components/onboarding/route-geometry";
import { durations, noTransition, tween } from "@/lib/motion/tokens";

/** The done fill grows from this scale as it fades in. */
const EMPTY_SCALE = 0.5;
const FILL_TRANSITION = { opacity: tween(durations.instant), scale: tween(durations.fast) };

interface RouteCheckpointProps {
  /** null while the reader's progress is still loading: drawn hollow. */
  state: CheckpointState | null;
  /** False for the state the page opens with; true once it has settled, so
   * only a tick (or untick) animates. */
  animateChanges: boolean;
  /** Placement on the route (absolute, from RouteMap). */
  className?: string;
}

/**
 * One day's stop on the route, 28px: hollow for a day ahead, an accent ring
 * where the reader is, a filled accent disc with a check once the day is
 * done. Three stacked layers, so a change is an opacity crossfade plus a
 * scale — ≤ 200 ms, transform and opacity only. Decoration: the row's label
 * and the day's checkbox say the same in words.
 */
export function RouteCheckpoint({ state, animateChanges, className = "" }: RouteCheckpointProps) {
  const reduce = useReducedMotion();
  const done = state === "done";
  const current = state === "current";
  const transition = animateChanges && !reduce ? FILL_TRANSITION : noTransition;

  return (
    <span aria-hidden="true" data-route-checkpoint={state ?? "loading"} className={`z-10 h-7 w-7 ${className}`}>
      <span className="absolute inset-0 rounded-full border-2 border-border bg-surface" />
      <m.span
        className="absolute inset-0 rounded-full border-2 border-accent bg-surface"
        initial={false}
        animate={{ opacity: current ? 1 : 0 }}
        transition={transition}
      />
      <m.span
        className="absolute inset-0 flex items-center justify-center rounded-full bg-accent text-on-accent"
        initial={false}
        animate={{ opacity: done ? 1 : 0, scale: done ? 1 : EMPTY_SCALE }}
        transition={transition}
      >
        <Check size={16} strokeWidth={3} />
      </m.span>
    </span>
  );
}
