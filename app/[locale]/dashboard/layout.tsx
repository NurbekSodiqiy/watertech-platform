import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ManagerMonitoringHeader } from "@/components/ManagerMonitoringHeader";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

// The manager gate (getServerSession + role check) deliberately stays at
// page level, same as before this task — every page under app/[locale]/dashboard
// repeats it, matching middleware's isManagerArea belt-and-suspenders
// pattern instead of a layout-level redirect (see app/[locale]/(admin)/admin/layout.tsx
// for the alternative this app intentionally didn't reuse here).
export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  return (
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
  );
}
