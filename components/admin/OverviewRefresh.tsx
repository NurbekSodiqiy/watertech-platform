"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useMounted } from "@/hooks/useMounted";

/** "Yangilandi 14:05" and a refresh button for the admin overview.
 * `renderedAt` is when the server rendered the page's data; it is formatted
 * only after mount (CLAUDE.md §15) — until then a same-width placeholder holds
 * the space. Refresh is router.refresh(): the page's server components run
 * again, so every widget re-reads the database, and this stamp gets the new
 * render time through its props. */
export function OverviewRefresh({ renderedAt }: { renderedAt: string }) {
  const t = useTranslations("pages.admin.overview");
  const locale = useLocale();
  const router = useRouter();
  const mounted = useMounted();
  const [pending, startTransition] = useTransition();

  const time = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(renderedAt));

  return (
    <div className="flex items-center gap-2">
      <span aria-live="polite" className="min-w-[7.5rem] text-right text-[12.5px] tabular-nums text-text-secondary">
        {mounted ? t("updatedAt", { time }) : null}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary-dark transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
      >
        <RefreshCw size={14} aria-hidden="true" className={pending ? "motion-safe:animate-spin" : ""} />
        {t("refresh")}
      </button>
    </div>
  );
}
