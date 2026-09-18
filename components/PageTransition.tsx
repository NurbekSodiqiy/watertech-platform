"use client";

import { m, useReducedMotion } from "framer-motion";
import { usePathname } from "@/i18n/routing";
import { distances, durations, easings } from "@/lib/motion/tokens";

// Enter-only: no exit animation, so the incoming page mounts immediately
// instead of waiting on an outgoing one to finish, and Suspense boundaries
// inside `children` can stream in without an AnimatePresence wrapper
// blocking them. Keyed by pathname (not search params) so changing a
// search param on the same route — filters, tabs — does not replay this.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <m.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: distances.nudge }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.instant, ease: easings.standard }}
      className="min-w-0"
    >
      {children}
    </m.div>
  );
}
