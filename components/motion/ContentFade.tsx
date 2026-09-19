"use client";

import { useState, type ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import { useMotionReady } from "@/hooks/useMotionReady";
import { durations, easings, tween } from "@/lib/motion/tokens";

/** Fades a page's real content in over `durations.fast` when it replaces its
 * loading.tsx skeleton, so it does not pop. Opacity only: no transform, no
 * size change, and the content is mounted and interactive from the first frame.
 *
 * Decided once, at mount. When the motion features are not loaded yet the
 * content came with the server HTML (a hard load or refresh), where hiding it
 * to fade it back would only flash it, so it renders as-is — same for reduced
 * motion. Only a client-side navigation, where the skeleton was on screen,
 * fades. */
export function ContentFade({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ready = useMotionReady();
  const [fade] = useState(() => ready && !reduce);

  return (
    <m.div
      className={className}
      initial={fade ? { opacity: 0 } : false}
      animate={{ opacity: 1, transition: tween(durations.fast, easings.standard) }}
    >
      {children}
    </m.div>
  );
}
