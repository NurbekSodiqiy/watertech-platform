"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { m, useScroll, useSpring, useTransform } from "framer-motion";
import { useSettledWhenReduced } from "@/hooks/useSettledWhenReduced";
import { springs } from "@/lib/motion/tokens";

export function Parallax({
  children,
  className,
  rangePx = 20,
}: {
  children: ReactNode;
  className?: string;
  rangePx?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Same fluid inertia as ScrollScene, so parallax and scenes move alike.
  // Under reduced motion progress holds at 0.5, which maps to y = 0.
  const progress = useSettledWhenReduced(useSpring(scrollYProgress, springs.fluid), 0.5);

  // Hydration-safe: starts false (matches server render) and is corrected in
  // an effect once the real viewport width is known.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  const range = isMobile ? Math.min(6, rangePx) : rangePx;
  const y = useTransform(progress, [0, 1], [-range, range]);

  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}
