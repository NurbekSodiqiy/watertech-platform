"use client";

import { createContext, useContext } from "react";
import type { MotionValue } from "framer-motion";

/** Provided by <ScrollScene>; 0 → 1 as the scene travels through its offsets. */
export const SceneProgressContext = createContext<MotionValue<number> | null>(null);

/** Scroll progress of the nearest <ScrollScene>, already smoothed with the
 * `fluid` spring (and pinned at 1 under reduced motion). Feed it to
 * useTransform / DrawPath — never read it into React state. */
export function useSceneProgress(): MotionValue<number> {
  const progress = useContext(SceneProgressContext);
  if (!progress) throw new Error("useSceneProgress() must be called inside <ScrollScene>.");
  return progress;
}
