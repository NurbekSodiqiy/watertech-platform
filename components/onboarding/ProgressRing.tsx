"use client";

import type { ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import { durations, noTransition, tween } from "@/lib/motion/tokens";

/** viewBox units: a 48 box, the ring's centre line at radius 20, 4 wide. */
const BOX = 48;
const RADIUS = 20;
const STROKE = 4;

const CHANGE_TRANSITION = { pathLength: tween(durations.fast), opacity: tween(durations.instant) };

interface ProgressRingProps {
  /** Share done, 0 → 1. */
  value: number;
  /** False for the value the page opens with (and while it loads): it is
   * shown as it is. True afterwards, so a tick eases the ring along. */
  animateChanges: boolean;
  /** Sizing classes; the ring fills the box. */
  className?: string;
  /** Centred inside the ring. */
  children?: ReactNode;
}

/**
 * The hero's ring: its accent arc covers `value` of the circle, from twelve
 * o'clock. Decoration only (aria-hidden) — the sentence next to it carries
 * the numbers. A change is ≤ 200 ms response motion, never a count-up.
 */
export function ProgressRing({ value, animateChanges, className = "", children }: ProgressRingProps) {
  const reduce = useReducedMotion();
  const level = Math.min(1, Math.max(0, value));

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <svg viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx={BOX / 2} cy={BOX / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-border" />
        <m.circle
          cx={BOX / 2}
          cy={BOX / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-accent"
          initial={false}
          // Opacity hides the dot a zero-length round cap would leave.
          animate={{ pathLength: level, opacity: level > 0 ? 1 : 0 }}
          transition={animateChanges && !reduce ? CHANGE_TRANSITION : noTransition}
        />
      </svg>
      {children}
    </span>
  );
}
