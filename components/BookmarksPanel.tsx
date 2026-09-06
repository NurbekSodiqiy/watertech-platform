"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, X } from "lucide-react";

export function BookmarksPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-primary-dark/30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
          />
          <motion.div
            className="relative flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-soft"
            initial={reduce ? undefined : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-primary-dark">
                <Bookmark size={16} />
                Saqlangan skriptlar
              </span>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-text-secondary hover:bg-primary/10"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center px-6">
              <p className="text-center text-[13.5px] text-text-secondary">Saqlangan skriptlar yo'q.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
