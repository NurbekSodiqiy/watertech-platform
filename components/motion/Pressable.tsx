"use client";

import { m, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { durations, tween } from "@/lib/motion/tokens";

const PRESSED = { scale: 0.97 };

/** A `<button>` that dips to 0.97 while pressed — response motion for controls
 * that trigger an action (copy, toggle theme, pick a chip). Not for links or
 * table rows. Everything else passes straight through to the button. */
export function Pressable({ disabled, ...props }: HTMLMotionProps<"button">) {
  const reduce = useReducedMotion();

  return (
    <m.button
      {...props}
      disabled={disabled}
      whileTap={reduce || disabled ? undefined : PRESSED}
      transition={tween(durations.instant)}
    />
  );
}
