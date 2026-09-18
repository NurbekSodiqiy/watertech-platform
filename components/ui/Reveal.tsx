"use client";

import type { ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import { distances, durations, easings } from "@/lib/motion/tokens";

/**
 * @deprecated Generic fade-up. Use `MaskReveal` for headings and short text,
 * or `Stagger` + `StaggerItem` for groups (components/motion/). Unlike those,
 * this ships its hidden state in the server HTML. Kept only until the
 * company pages move over.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = distances.reveal,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2, margin: "0px 0px -10% 0px" }}
      transition={{ duration: durations.base, ease: easings.standard, delay }}
    >
      {children}
    </m.div>
  );
}
