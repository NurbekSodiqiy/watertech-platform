"use client";

import type { ReactNode } from "react";
import { m, type Variants } from "framer-motion";
import { distances, durations, easings, noTransition } from "@/lib/motion/tokens";

const VARIANTS: Variants = {
  hidden: { opacity: 0, y: distances.reveal, transition: noTransition },
  visible: { opacity: 1, y: 0, transition: { duration: durations.base, ease: easings.standard } },
};

/** One step of a <Stagger> cascade. Inherits its state from the nearest
 * <Stagger>; on its own it simply renders its content. */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} variants={VARIANTS}>
      {children}
    </m.div>
  );
}
