"use client";

import { useEffect } from "react";
import { cancelFrame, frame, useMotionValue, useReducedMotion, type MotionValue } from "framer-motion";
import { useMotionReady } from "@/hooks/useMotionReady";

/**
 * Passes `source` through, but holds it at `settled` for users who prefer
 * reduced motion. The switch happens after mount, not during render:
 * useReducedMotion() is only known in the browser, so branching the rendered
 * tree on it would not match the server HTML.
 *
 * Two ordering details, both found in the browser:
 * - It waits for useMotionReady(): when the lazy features arrive, framer
 *   builds each element's VisualElement and writes the first render's values
 *   back into its style motion values, clobbering any earlier one-off write.
 * - The write is deferred a frame (cancelled on cleanup): StrictMode's
 *   mount → unmount → mount cancels the element's pending render on the fake
 *   unmount, and a second identical write would not notify again.
 */
export function useSettledWhenReduced(source: MotionValue<number>, settled = 1): MotionValue<number> {
  const reduce = useReducedMotion();
  const ready = useMotionReady();
  const output = useMotionValue(source.get());

  useEffect(() => {
    if (!ready) return;
    const sync = () => output.set(reduce ? settled : source.get());
    frame.update(sync);
    const unsubscribe = reduce ? undefined : source.on("change", (latest) => output.set(latest));
    return () => {
      cancelFrame(sync);
      unsubscribe?.();
    };
  }, [ready, reduce, source, settled, output]);

  return output;
}
