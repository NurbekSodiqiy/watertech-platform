"use client";

import { useEffect, useState, type RefObject } from "react";
import { useInView, useIsomorphicLayoutEffect, useReducedMotion, type UseInViewOptions } from "framer-motion";
import { useMotionReady } from "@/hooks/useMotionReady";
import { isInitiallyInView } from "@/lib/motion/tokens";

/**
 * - `static`: the final state. What the server renders, what first client
 *   paint shows, and where anything visible at mount (or under reduced
 *   motion) stays for good.
 * - `armed`: below the fold at mount, so instantly set to its hidden state
 *   while nobody can see it.
 * - `revealed`: scrolled into view, animating to the final state.
 */
export type RevealPhase = "static" | "armed" | "revealed";

export interface RevealPhaseOptions {
  amount?: UseInViewOptions["amount"];
  margin?: UseInViewOptions["margin"];
  /** Reveal when this turns true instead of when the element scrolls into
   * view (e.g. when a pipeline fitting seats). Arming is unchanged: content
   * already visible at mount still stays put. */
  when?: boolean;
}

/**
 * Drives one-shot reveals without ever shipping hidden text in server HTML.
 * Components render `initial={false}` and pass `revealVariant(phase)` to
 * `animate`, with a zero-duration `hidden` variant, so the server output,
 * the no-JS page and a slow-hydrating page all show the finished content.
 * Only content that starts off-screen is hidden, after mount and before it
 * can be seen, then revealed when it scrolls in.
 */
export function useRevealPhase(ref: RefObject<Element>, options: RevealPhaseOptions = {}): RevealPhase {
  const { amount = 0.2, margin = "0px 0px -10% 0px", when } = options;
  const reduce = useReducedMotion();
  const ready = useMotionReady();
  const [phase, setPhase] = useState<RevealPhase>("static");
  const inView = useInView(ref, { once: true, amount, margin });
  const trigger = when ?? inView;

  // Arms only once the animation features are loaded (see useMotionReady),
  // measuring position at that moment; a layout effect, so the switch to the
  // hidden state lands before the browser paints.
  useIsomorphicLayoutEffect(() => {
    if (reduce) {
      setPhase("static");
      return;
    }
    const el = ref.current;
    if (!ready || !el) return;
    setPhase((current) =>
      current === "static" && !isInitiallyInView(el.getBoundingClientRect(), window.innerHeight) ? "armed" : current
    );
  }, [ref, reduce, ready]);

  useEffect(() => {
    if (phase === "armed" && trigger) setPhase("revealed");
  }, [phase, trigger]);

  return phase;
}

/** Variant label for `animate`, given a phase. */
export function revealVariant(phase: RevealPhase): "hidden" | "visible" {
  return phase === "armed" ? "hidden" : "visible";
}
