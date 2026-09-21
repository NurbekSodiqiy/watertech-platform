"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

const LOCALES = ["uz", "ru"] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("chrome.localeSwitcher");

  // A labelled group of toggle buttons: the visible text is the two-letter
  // code, which a screen reader would spell out, so each button carries the
  // language's own name and the group says what is being switched.
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-alt p-1"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={locale === l}
          aria-label={t(l)}
          className={`rounded-full px-2 py-1.5 text-xs font-medium uppercase sm:px-2.5 ${
            locale === l ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
