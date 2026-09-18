"use client";

import { useRef, type ReactNode } from "react";
import { useScroll, useSpring, type UseScrollOptions } from "framer-motion";
import { SceneProgressContext } from "@/hooks/useSceneProgress";
import { useSettledWhenReduced } from "@/hooks/useSettledWhenReduced";
import { springs } from "@/lib/motion/tokens";

interface ScrollSceneProps {
  children: ReactNode;
  className?: string;
  /** When progress is 0 and 1, as [target edge, viewport edge] pairs.
   * Default: from the scene's top entering the viewport bottom to its bottom
   * leaving the viewport top. */
  offset?: UseScrollOptions["offset"];
}

const DEFAULT_OFFSET: UseScrollOptions["offset"] = ["start end", "end start"];

/**
 * The one orchestrated scroll scene a page may have (CLAUDE.md §14). Owns
 * the scroll measurement and hands descendants a smoothed 0 → 1 progress via
 * useSceneProgress(). Progress lives in motion values only — scrolling never
 * re-renders React. Under reduced motion progress is pinned at 1, so every
 * consumer shows its final state.
 *
 * Children must stay readable at any progress value (server render included):
 * drive decoration, line art and transforms with it, not text visibility.
 */
export function ScrollScene({ children, className = "", offset = DEFAULT_OFFSET }: ScrollSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const progress = useSettledWhenReduced(useSpring(scrollYProgress, springs.fluid));

  return (
    <SceneProgressContext.Provider value={progress}>
      <div ref={ref} className={`relative ${className}`}>
        {children}
      </div>
    </SceneProgressContext.Provider>
  );
}
