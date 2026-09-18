"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion";
import { useRevealPhase } from "@/hooks/useRevealPhase";
import { formatCount } from "@/lib/motion/format-count";
import { durations, easings } from "@/lib/motion/tokens";

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * A number that counts up to `value` the first time it scrolls into view.
 * The server (and reduced motion, and anything already on screen at mount)
 * renders the final formatted value. Frames are written straight to the
 * node's textContent from a motion value — no React render per frame.
 * Screen readers get the final value only.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", className = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const phase = useRevealPhase(ref, { amount: 0.5 });
  const count = useMotionValue(value);
  const text = useTransform(count, (latest) => formatCount(latest, decimals));

  useMotionValueEvent(text, "change", (latest) => {
    if (ref.current) ref.current.textContent = latest;
  });

  useEffect(() => {
    if (phase === "armed") {
      count.jump(0);
      return;
    }
    if (phase === "revealed") {
      const controls = animate(count, value, { duration: durations.slow, ease: easings.standard });
      return () => controls.stop();
    }
    count.jump(value);
  }, [phase, value, count]);

  const formatted = formatCount(value, decimals);

  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">
        {prefix}
        <span ref={ref}>{formatted}</span>
        {suffix}
      </span>
      <span className="sr-only">{`${prefix}${formatted}${suffix}`}</span>
    </span>
  );
}
