"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useRevealPhase, type RevealPhase } from "@/hooks/useRevealPhase";

const BarGrowPhaseContext = createContext<RevealPhase>("static");

/** The reveal phase of the chart a bar sits in — "static" (drawn at full
 * length) outside a group. */
export function useBarGrowPhase(): RevealPhase {
  return useContext(BarGrowPhaseContext);
}

/** One chart's worth of bars grows together, off one in-view observer: a
 * person grid of 30 rows × 31 days would otherwise start ~900 of them. The
 * phase comes from useRevealPhase, so the server HTML, the first client paint,
 * reduced motion and a chart already on screen at mount all show the final
 * bars; only a chart that starts below the fold is collapsed (while nobody can
 * see it) and grows once when it scrolls in. */
export function BarGrowGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useRevealPhase(ref, { amount: 0.3 });
  return (
    <div ref={ref} className={className}>
      <BarGrowPhaseContext.Provider value={phase}>{children}</BarGrowPhaseContext.Provider>
    </div>
  );
}
