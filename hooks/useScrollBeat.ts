"use client";

import { useEffect, type RefObject } from "react";
import { useScroll, useSpring, type MotionValue, type UseScrollOptions } from "framer-motion";
import { springs } from "@/lib/motion/tokens";

/**
 * Feeds `into` with the scroll progress of `target` through `offset`,
 * smoothed with the `fluid` spring (as ScrollScene does). For a scene whose
 * drawing sits in one place (a sticky figure) while the elements that drive
 * it stay in reading order elsewhere: each element runs this against its own
 * position, the drawing reads the values it was handed.
 *
 * `target` must be attached in the calling component (useScroll measures it
 * in a layout effect). Motion values only — scrolling never sets React state.
 */
export function useScrollBeat(
  target: RefObject<HTMLElement>,
  offset: UseScrollOptions["offset"],
  into: MotionValue<number>
): void {
  const { scrollYProgress } = useScroll({ target, offset });
  const smooth = useSpring(scrollYProgress, springs.fluid);

  useEffect(() => {
    into.set(smooth.get());
    return smooth.on("change", (latest) => into.set(latest));
  }, [smooth, into]);
}
