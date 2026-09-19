"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { m, type Variants } from "framer-motion";
import { revealVariant, useRevealPhase } from "@/hooks/useRevealPhase";
import { durations, easings, noTransition } from "@/lib/motion/tokens";

const VARIANTS: Variants = {
  hidden: { y: "100%", opacity: 0, transition: noTransition },
  visible: (delay: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: durations.base, ease: easings.standard, delay },
  }),
};

interface MaskRevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds; for sequencing a few lines by hand. Prefer <Stagger> for lists. */
  delay?: number;
  /** "div" when the content is block-level (paragraphs); default "span". */
  as?: "span" | "div";
  /** Reveal when this turns true rather than on scrolling into view. */
  when?: boolean;
}

/**
 * Text rises from behind a clip mask the first time it scrolls into view (or
 * when `when` turns true). Place it inside the text element so semantics stay
 * put: `<h2><MaskReveal>Title</MaskReveal></h2>`; wrap block content with
 * `as="div"`. Content visible at mount, and everything under reduced motion,
 * renders final with no animation.
 */
export function MaskReveal({ children, className = "", delay = 0, as = "span", when }: MaskRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const phase = useRevealPhase(ref, { amount: 0.5, when });
  const Outer = as;
  const Inner = as === "div" ? m.div : m.span;

  // The padding/negative-margin pair gives descenders room inside the mask
  // without changing the line box the surrounding layout sees.
  return (
    <Outer ref={setRef} className={`block overflow-hidden pb-[0.12em] -mb-[0.12em] ${className}`}>
      <Inner className="block" initial={false} animate={revealVariant(phase)} variants={VARIANTS} custom={delay}>
        {children}
      </Inner>
    </Outer>
  );
}
