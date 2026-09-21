"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { subscribe, getSnapshot, getServerSnapshot, dismiss } from "./toast-store";
import type { ToastItem, ToastKind } from "./toast-store";
import { distances, durations, easings, tween } from "@/lib/motion/tokens";
import { useTranslations } from "next-intl";
import { Pressable } from "@/components/motion/Pressable";

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

// error reuses status-outdated — this codebase has no separate "danger"
// token (see MetadataBadgeRow/EntityForm/ConfirmDialog, all of which use
// status-outdated for destructive/error state).
const TONE_ICON_CLASSES: Record<ToastKind, string> = {
  success: "text-status-ok",
  error: "text-status-outdated",
  info: "text-accent",
};

function ToastCard({ item }: { item: ToastItem }) {
  const t = useTranslations("common");
  const reduce = useReducedMotion();
  const Icon = ICONS[item.kind];

  return (
    <m.div
      role={item.kind === "error" ? "alert" : "status"}
      aria-live={item.kind === "error" ? undefined : "polite"}
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: distances.lift }}
      animate={{ opacity: 1, y: 0, transition: tween(durations.fast, easings.standard) }}
      exit={reduce ? undefined : { opacity: 0, transition: tween(durations.instant, easings.exit) }}
      className="flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-soft"
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${TONE_ICON_CLASSES[item.kind]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-primary-dark">{item.title}</p>
        {item.description && <p className="mt-0.5 text-[12.5px] text-text-secondary">{item.description}</p>}
        {item.action && (
          <Pressable
            type="button"
            onClick={() => {
              item.action?.onClick();
              dismiss(item.id);
            }}
            className="mt-1.5 text-[12.5px] font-medium text-primary hover:underline"
          >
            {item.action.label}
          </Pressable>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label={t("close")}
        className="shrink-0 rounded-md p-0.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary-dark"
      >
        <X size={13} />
      </button>
    </m.div>
  );
}

/** Mounted once in app/[locale]/layout.tsx so it covers the operator app,
 * admin CMS and manager dashboard alike. Fixed positioning only — never a
 * portal (this codebase's Dialog primitive avoids one too). The container stays
 * mounted when empty so the last toast can play its exit. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
