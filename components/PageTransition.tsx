"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "@/i18n/routing";

// Enter-only: no exit animation, so the incoming page mounts immediately
// instead of waiting on an outgoing one to finish, and Suspense boundaries
// inside `children` can stream in without an AnimatePresence wrapper
// blocking them. Keyed by pathname (not search params) so changing a
// search param on the same route — filters, tabs — does not replay this.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
      className="min-w-0"
    >
      {children}
    </motion.div>
  );
}
