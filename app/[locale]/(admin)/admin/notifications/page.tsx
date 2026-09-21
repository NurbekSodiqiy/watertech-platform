import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { listNotifications } from "@/lib/notifications/queries";
import { NotificationsInbox } from "@/components/admin/NotificationsInbox";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.notifications" });
  return { title: t("title") };
}

// Rows come back unread first, so this cap only ever trims old, already-read
// notifications — the client-side ?unread=1 filter never misses an unread one
// unless more than this many are unread at once.
const INBOX_LIMIT = 200;

export default async function AdminNotificationsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.notifications");

  const rows = await listNotifications({ unreadOnly: false, limit: INBOX_LIMIT });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          {t("description")}
        </p>
      </div>
      {/* useSearchParams() inside needs a Suspense boundary (CLAUDE.md section 3). */}
      <Suspense fallback={null}>
        <NotificationsInbox rows={rows} />
      </Suspense>
    </div>
  );
}
