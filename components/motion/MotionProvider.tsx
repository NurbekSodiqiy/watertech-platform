"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LazyMotion, MotionConfig, type FeatureBundle } from "framer-motion";
import { MotionReadyContext } from "@/hooks/useMotionReady";

function importFeatures(): Promise<FeatureBundle> {
  return import("@/lib/motion/features").then((mod) => mod.default);
}

// Start fetching the feature chunk as soon as this module is evaluated in the
// browser, in parallel with hydration, rather than waiting for LazyMotion's
// mount effect to ask for it. Until it arrives, `m.*` elements render their
// initial state without animating.
const featuresPromise: Promise<FeatureBundle> | null = typeof window === "undefined" ? null : importFeatures();

function loadFeatures(): Promise<FeatureBundle> {
  return featuresPromise ?? importFeatures();
}

/** Mounted once in app/[locale]/layout.tsx. `strict` makes any stray
 * `motion.*` (which would pull the full bundle into the initial chunk) throw,
 * so every animated element must use `m.*`. `reducedMotion="user"` makes
 * transform animations instant for users who ask for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  // LazyMotion (a child, so its effect runs first) registers the features in
  // its own `.then` on the same promise; this one resolves after it.
  useEffect(() => {
    let active = true;
    void loadFeatures().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <MotionReadyContext.Provider value={ready}>{children}</MotionReadyContext.Provider>
      </MotionConfig>
    </LazyMotion>
  );
}
