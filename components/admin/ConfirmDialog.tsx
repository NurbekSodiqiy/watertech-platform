"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { overlayFadeVariants, overlayPanelVariants } from "@/components/ui/Dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.confirm");
  const reduce = useReducedMotion();

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
            className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-soft"
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
                <p className="text-[14px] font-semibold text-primary-dark">{title}</p>
                <p className="mt-1 text-[13px] text-text-secondary">{description}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="rounded-lg bg-status-outdated px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:opacity-90 disabled:opacity-50"
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
