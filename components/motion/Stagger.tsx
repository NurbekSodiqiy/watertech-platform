"use client";

import { Children, useRef, type ReactNode } from "react";
import { m, type Variants } from "framer-motion";
import { revealVariant, useRevealPhase } from "@/hooks/useRevealPhase";
import { noTransition, staggerStep } from "@/lib/motion/tokens";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Number of <StaggerItem>s when they are not direct children (wrapped in
   * fragments or other elements); defaults to the direct child count. */
  count?: number;
}

/**
 * Reveals its <StaggerItem> descendants in sequence the first time the group
 * scrolls into view. The per-child delay shrinks with the child count so the
 * whole cascade never exceeds `staggers.maxCascade` (400 ms).
 */
export function Stagger({ children, className, count }: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useRevealPhase(ref);
  const step = staggerStep(count ?? Children.count(children));

  const variants: Variants = {
    hidden: { transition: noTransition },
    visible: { transition: { staggerChildren: step } },
  };

  return (
    <m.div ref={ref} className={className} initial={false} animate={revealVariant(phase)} variants={variants}>
      {children}
    </m.div>
  );
}
