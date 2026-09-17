"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

/** What a crashed widget shows in its place — same card tokens as EmptyState. */
export function WidgetFallback({ reset, titleId }: { reset: () => void; titleId?: string }) {
  const t = useTranslations("widgetFallback");

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-6 py-6 text-center">
      <p id={titleId} className="text-[13px] text-text-secondary">
        {t("message")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
      >
        <RotateCcw size={12} />
        {t("retry")}
      </button>
    </div>
  );
}
