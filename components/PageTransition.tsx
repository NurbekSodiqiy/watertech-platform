"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

// Extra buffer, on top of AnimatePresence's own exit-then-enter sequencing,
// before the next page mounts — gives an outgoing GSAP-driven page's
// cleanup (ScrollTrigger.kill() etc., which runs on unmount) a moment to
// fully settle before the next page's own GSAP setup effect runs.
const ENTER_DELAY_MS = 80;

function isOperatorSalesProcessPage(pathname: string) {
  return pathname === "/sales-process" || pathname.startsWith("/sales-process/");
}

type Shown = { path: string; node: React.ReactNode };

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // Operators bounce between /sales-process/* pages fast enough, back to
  // back, that the transition itself becomes the risk rather than the
  // benefit — skip it there entirely instead of trying to make it safe.
  const skipTransition = isOperatorSalesProcessPage(pathname);

  // `visible` is null while the outgoing page's exit animation (plus the
  // buffer above) is still playing — AnimatePresence only mounts the next
  // page once `visible` is set again, so the outgoing page's DOM is
  // completely gone first instead of ever overlapping with the next page.
  const [visible, setVisible] = useState<Shown | null>({ path: pathname, node: children });

  useEffect(() => {
    if (skipTransition) return;
    setVisible((current) => {
      if (!current) return current; // already exiting — let onExitComplete bring the next page in
      if (current.path === pathname) return { path: pathname, node: children }; // same route, refreshed content
      return null; // different route — trigger the exit
    });
  }, [pathname, children, skipTransition]);

  if (skipTransition) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
      onExitComplete={() => {
        setTimeout(() => setVisible({ path: pathname, node: children }), ENTER_DELAY_MS);
      }}
    >
      {visible && (
        <motion.div
          key={visible.path}
          initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {visible.node}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
