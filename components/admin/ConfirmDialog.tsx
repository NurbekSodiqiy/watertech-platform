"use client";

import { useId } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { overlayFadeVariants, overlayPanelVariants } from "@/components/ui/Dialog";

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
  confirmLabel?: string;
  /** "danger" for a delete (the default), "primary" for a confirm that keeps
   * the row — unpublishing it instead of deleting it. */
  tone?: "danger" | "primary";
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
  confirmLabel,
  tone = "danger",
  secondary,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations("admin.confirm");
  const reduce = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            // Three actions (cancel + the safe alternative + the destructive
            // one) need the wider panel to stay on one row.
            className={`relative w-full rounded-2xl border border-border bg-surface p-5 shadow-soft ${
              secondary ? "max-w-md" : "max-w-sm"
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
                <p id={descriptionId} className="mt-1 text-[13px] text-text-secondary">
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
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                  tone === "primary"
                    ? "bg-primary text-on-accent hover:bg-accent-hover"
                    : "bg-status-outdated text-surface hover:opacity-90"
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
