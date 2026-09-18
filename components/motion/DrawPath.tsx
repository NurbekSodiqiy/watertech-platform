"use client";

import { useRef } from "react";
import { m, useTransform, type MotionValue, type Variants } from "framer-motion";
import { revealVariant, useRevealPhase } from "@/hooks/useRevealPhase";
import { useSettledWhenReduced } from "@/hooks/useSettledWhenReduced";
import { durations, easings, noTransition } from "@/lib/motion/tokens";

interface DrawPathProps {
  d: string;
  /** Scroll-linked mode: pathLength follows this 0 → 1 value (e.g.
   * useSceneProgress()). Omit for a one-shot draw when the path scrolls into view. */
  progress?: MotionValue<number>;
  /** Stroke colour via palette tokens, e.g. "stroke-accent". */
  className?: string;
  strokeWidth?: number;
}

type PathProps = Omit<DrawPathProps, "progress">;

const IN_VIEW_VARIANTS: Variants = {
  hidden: { pathLength: 0, opacity: 0, transition: noTransition },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: durations.slow, ease: easings.standard },
      opacity: { duration: durations.instant },
    },
  },
};

function ScrollDrawnPath({ d, progress, className, strokeWidth = 1.5 }: PathProps & { progress: MotionValue<number> }) {
  const pathLength = useSettledWhenReduced(progress);
  // Hides the round-cap dot a zero-length stroke would otherwise leave.
  const opacity = useTransform(pathLength, [0, 0.02], [0, 1]);

  return (
    <m.path
      d={d}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      className={className}
      style={{ pathLength, opacity }}
    />
  );
}

function InViewDrawnPath({ d, className, strokeWidth = 1.5 }: PathProps) {
  const ref = useRef<SVGPathElement>(null);
  const phase = useRevealPhase(ref, { amount: 0.5 });

  return (
    <m.path
      ref={ref}
      d={d}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      className={className}
      initial={false}
      animate={revealVariant(phase)}
      variants={IN_VIEW_VARIANTS}
    />
  );
}

/** A line-art stroke that draws itself. Render it inside an <svg> with a
 * viewBox; the stroke keeps its width however the svg is scaled. Under
 * reduced motion the full path is shown. */
export function DrawPath({ progress, ...props }: DrawPathProps) {
  return progress ? <ScrollDrawnPath progress={progress} {...props} /> : <InViewDrawnPath {...props} />;
}
