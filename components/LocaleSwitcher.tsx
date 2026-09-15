"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

const LOCALES = ["uz", "ru"] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-alt p-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase ${
            locale === l ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
