"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { overlayFadeVariants, overlayPanelVariants } from "@/components/ui/Dialog";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  /** Rows the decision is about — the scripts that still use an objection,
   * the packages a group would take with it. Titles the manager wrote, never
   * ids and never text from the database's own errors. */
  items?: string[];
  /** One line under the list when it was capped ("+3 more"). */
  itemsMore?: string;
  /** Anything else the decision needs, between the description and the
   * buttons: consequences spelled out, an option, a typed confirmation
   * (RemovePersonDialog). The panel widens when there is a body. */
  children?: ReactNode;
  confirmLabel?: string;
  /** "danger" for a delete (the default), "primary" for a confirm that keeps
   * the row — unpublishing it instead of deleting it. */
  tone?: "danger" | "primary";
  /** The confirm button stays disabled while the body is incomplete — e.g.
   * until the typed confirmation matches. */
  confirmDisabled?: boolean;
  /** What receives focus on open instead of the first control (Cancel) — the
   * field the admin has to fill in, when the body has one. */
  initialFocusRef?: RefObject<HTMLElement>;
  /** The safe way out, next to Cancel: "move to draft" on a delete the
   * reference guard stopped. */
  secondary?: { label: string; onClick: () => void };
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  items,
  itemsMore,
  children,
  confirmLabel,
  tone = "danger",
  confirmDisabled = false,
  initialFocusRef,
  secondary,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations("admin.confirm");
  const reduce = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // A modal in fact, not only in aria-modal: focus moves in (to Cancel, the
  // first control — the safe answer — unless the body names a field to fill
  // in), Tab stays inside, and it goes back to the trigger on close (R3
  // release audit). Same hook as <Dialog>.
  useFocusTrap(panelRef, open, initialFocusRef);

  // Escape is Cancel, except while the action is in flight — the buttons are
  // disabled then too, so the dialog cannot be dismissed mid-write.
  useEffect(() => {
    if (!open || pending) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <m.div
            className="absolute inset-0 bg-primary-dark/40"
            onClick={onCancel}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit={reduce ? undefined : "hidden"}
            variants={overlayFadeVariants}
          />
          <m.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            // Three actions (cancel + the safe alternative + the destructive
            // one) need the wider panel to stay on one row; a body needs the
            // room to read. It scrolls inside a short viewport.
            className={`relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-soft ${
              secondary || children ? "max-w-md" : "max-w-sm"
            }`}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit={reduce ? undefined : "hidden"}
            variants={overlayPanelVariants}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-outdated/15 text-status-outdated">
                <AlertTriangle size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p id={titleId} className="text-[14px] font-semibold text-primary-dark">
                  {title}
                </p>
                {/* break-words: a description may name a long email, which
                    has no break opportunity of its own (375px). */}
                <p id={descriptionId} className="mt-1 break-words text-[13px] text-text-secondary">
                  {description}
                </p>
              </div>
            </div>

            {items && items.length > 0 && (
              <div className="mt-3">
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-alt px-3 py-2">
                  {items.map((item) => (
                    <li key={item} className="truncate text-[12.5px] text-primary-dark">
                      {item}
                    </li>
                  ))}
                </ul>
                {/* Outside the scroll box: "+3 more" is the one line that must
                    not be the thing the manager has to scroll to find. */}
                {itemsMore && <p className="mt-1.5 text-[12px] text-text-secondary">{itemsMore}</p>}
              </div>
            )}

            {children && <div className="mt-4 space-y-3">{children}</div>}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              {secondary && (
                <button
                  type="button"
                  onClick={secondary.onClick}
                  disabled={pending}
                  className="rounded-lg border border-border bg-surface-alt px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-primary/5 disabled:opacity-50"
                >
                  {secondary.label}
                </button>
              )}
              {/* Danger is a tinted fill with a solid status-outdated border and
                  text-primary-dark: white on the solid fill is 3.71:1 in the
                  light theme (docs/AUDIT.md §3), below AA for 13px text; this
                  reads ≥ 9:1 in both themes and the border keeps ≥ 3:1 as the
                  control's edge (tests/unit/ui/design-tokens.test.ts). */}
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending || confirmDisabled}
                className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  tone === "primary"
                    ? "border-transparent bg-primary text-on-accent hover:bg-accent-hover"
                    : "border-status-outdated bg-status-outdated/15 text-primary-dark hover:bg-status-outdated/25"
                }`}
              >
                {pending ? t("working") : (confirmLabel ?? t("delete"))}
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
