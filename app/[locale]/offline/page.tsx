import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { RetryButton } from "./RetryButton";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "chrome.offline" });
  return { title: t("title") };
}

/** Precached at build time and served by the service worker whenever a
 * document request can't be satisfied from the network or the cache (see
 * `fallbacks` in app/sw.ts). Deliberately outside the (app) group: AppShell's
 * sidebar links would be dead ends here, and the page has to render from the
 * precache with no data of its own. Mirrors DocPageTemplate's container so it
 * doesn't read as a different product. */
export default async function OfflinePage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("chrome.offline");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 text-center shadow-soft">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-status-warning/10 text-status-warning">
            <WifiOff size={26} aria-hidden="true" />
          </span>

          <div className="space-y-2">
            <h1 className="text-[24px] font-bold tracking-tight text-primary-dark">{t("title")}</h1>
            <p className="mx-auto max-w-md text-[14px] leading-relaxed text-text-secondary">
              {t("description")}
            </p>
          </div>

          <RetryButton label={t("retry")} />

          <p className="mx-auto max-w-md border-t border-border pt-5 text-[13px] leading-relaxed text-text-secondary">
            {t("cachedNote")}
          </p>
        </div>
      </div>
    </main>
  );
}
