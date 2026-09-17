"use client";

import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getCallModeServerSnapshot,
  getCallModeSnapshot,
  subscribeCallMode,
} from "@/components/copilot/call-mode-store";

/** Floating Copilot launcher, mounted by AppShell (so operator pages only —
 * admin and dashboard have their own layouts). z-40 keeps it under the
 * z-50 toast stack. Hidden while Call Mode covers the screen, unless the
 * panel is already open. */
export function CopilotButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useTranslations("copilot");
  const callModeOpen = useSyncExternalStore(subscribeCallMode, getCallModeSnapshot, getCallModeServerSnapshot);

  if (callModeOpen && !open) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${t("open")} (Ctrl+J)`}
      aria-expanded={open}
      title={`${t("open")} (Ctrl+J)`}
      className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl text-surface bg-primary shadow-soft transition-colors hover:bg-primary-hover"
    >
      <Sparkles size={20} />
    </button>
  );
}
