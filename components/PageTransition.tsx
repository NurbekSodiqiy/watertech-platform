"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // 'popLayout' prevents the layout from breaking/freezing during exit animations
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
