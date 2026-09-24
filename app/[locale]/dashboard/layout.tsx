import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ManagerMonitoringHeader } from "@/components/ManagerMonitoringHeader";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DASHBOARD_CLIENT_NAMESPACES, ROOT_CLIENT_NAMESPACES, pickMessages } from "@/lib/i18n/client-messages";

// The admin gate (requireAdminPage, lib/auth/server-session.ts) deliberately
// stays at page level — every page under app/[locale]/dashboard calls it
// first, the page-side counterpart of middleware's isAdminArea(), instead of
// a layout-level redirect (see app/[locale]/(admin)/admin/layout.tsx for the
// alternative this app intentionally didn't reuse here).
export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  // A nested provider replaces the parent's messages instead of merging, so it repeats the root list.
  const messages = pickMessages(await getMessages(), [...ROOT_CLIENT_NAMESPACES, ...DASHBOARD_CLIENT_NAMESPACES]);
  return (
    <NextIntlClientProvider messages={messages}>
      <SessionProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <ManagerMonitoringHeader notificationsSlot={<NotificationsBell />} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
              <PageHeader
                path="/dashboard"
                title={t("title")}
                description={t("description")}
              />
              <DashboardTabs />
              {children}
            </div>
          </main>
        </div>
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
