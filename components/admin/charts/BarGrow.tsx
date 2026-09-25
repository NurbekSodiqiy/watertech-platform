"use client";

import type { CSSProperties } from "react";
import { m, type Variants } from "framer-motion";
import { revealVariant } from "@/hooks/useRevealPhase";
import { useBarGrowPhase } from "@/components/admin/charts/BarGrowGroup";
import { durations, noTransition, tween } from "@/lib/motion/tokens";

const GROW: Record<"x" | "y", Variants> = {
  x: {
    hidden: { scaleX: 0, transition: noTransition },
    visible: { scaleX: 1, transition: tween(durations.slow) },
  },
  y: {
    hidden: { scaleY: 0, transition: noTransition },
    visible: { scaleY: 1, transition: tween(durations.slow) },
  },
};

/** A bar fill that grows along `axis` once, when its BarGrowGroup reveals
 * (CLAUDE.md §15: the charts' only motion). `initial={false}` — the server and
 * the first client paint draw the finished bar; reduced motion never leaves
 * that state (useRevealPhase). The length itself is the caller's inline
 * `style` percentage, so the bar is correct with JS disabled. */
export function BarGrow({ axis, className, style }: { axis: "x" | "y"; className: string; style: CSSProperties }) {
  const phase = useBarGrowPhase();
  return (
    <m.div
      aria-hidden
      className={`${axis === "x" ? "origin-left" : "origin-bottom"} ${className}`}
      style={style}
      variants={GROW[axis]}
      initial={false}
      animate={revealVariant(phase)}
    />
  );
}
