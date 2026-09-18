"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { distances, durations, easings } from "@/lib/motion/tokens";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names this dialog — a visible heading wherever
   * there is one, so screen readers announce the same title sighted users see. */
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  /** Positioning layer: where the panel sits in the viewport, and which
   * stacking level it occupies (the fixed/inset part is supplied here). */
  containerClassName?: string;
  /** The panel itself: its own box, surface and shadow. */
  panelClassName?: string;
  /** Off for panels that already cover the viewport opaquely (Call Mode). */
  backdrop?: boolean;
  backdropClassName?: string;
  /** "panel" is the lift-and-scale the command palette has always used;
   * "fade" suits full-screen surfaces, where scaling looks like a glitch. */
  motionStyle?: "panel" | "fade";
  /** Return false to let a particular Escape press through — Call Mode uses
   * this to keep Escape meaning "clear the search box" while typing. */
  shouldCloseOnEscape?: (event: KeyboardEvent) => boolean;
}

// Only ever animated *to* on exit (enter starts from it), so it carries the
// accelerating exit curve.
const EXIT_TRANSITION = { duration: durations.instant, ease: easings.exit };

const PANEL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.97, y: -distances.lift, transition: EXIT_TRANSITION },
  visible: { opacity: 1, scale: 1, y: 0 },
};

const FADE_VARIANTS = {
  hidden: { opacity: 0, transition: EXIT_TRANSITION },
  visible: { opacity: 1 },
};

/**
 * The one modal wrapper: `role="dialog"` + `aria-modal`, a focus trap that
 * restores focus to the trigger on close, Escape and backdrop-click closing,
 * and enter/exit motion. Callers supply the panel's own layout and content.
 *
 * Rendered in place rather than through a portal — every caller sits under
 * PageTransition, whose transform resolves to `none` once its 120 ms enter
 * animation settles, so `fixed` positioning here is viewport-relative.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  children,
  containerClassName = "z-50 flex items-center justify-center p-4",
  panelClassName = "",
  backdrop = true,
  backdropClassName = "bg-primary-dark/40 backdrop-blur-sm",
  motionStyle = "panel",
  shouldCloseOnEscape,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useFocusTrap(panelRef, open);

  // On document, not on the panel: clicking a non-focusable part of a dialog
  // (the image in the certificate lightbox, say) leaves document.activeElement
  // on <body>, and a React handler bound to the panel would never see the
  // keypress that follows.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (shouldCloseOnEscape && !shouldCloseOnEscape(event)) return;
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, shouldCloseOnEscape]);

  const variants = motionStyle === "fade" ? FADE_VARIANTS : PANEL_VARIANTS;

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${containerClassName}`} role="presentation">
          {backdrop && (
            <m.div
              className={`absolute inset-0 ${backdropClassName}`}
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : durations.instant }}
            />
          )}
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className={`relative ${panelClassName}`}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit={reduce ? undefined : "hidden"}
            variants={variants}
            transition={{ duration: reduce ? 0 : durations.instant, ease: easings.standard }}
          >
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
