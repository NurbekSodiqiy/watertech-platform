import { unstable_setRequestLocale } from "next-intl/server";
import { ManagerMonitoringHeader } from "@/components/ManagerMonitoringHeader";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

// The manager gate (getServerSession + role check) deliberately stays at
// page level, same as before this task — every page under app/[locale]/dashboard
// repeats it, matching middleware's isManagerArea belt-and-suspenders
// pattern instead of a layout-level redirect (see app/[locale]/(admin)/admin/layout.tsx
// for the alternative this app intentionally didn't reuse here).
export default function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <ManagerMonitoringHeader />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
            <PageHeader
              path="/dashboard"
              title="Rahbariyat monitoring"
              description="Operatorlar faolligi, kontent holati va sifat ko'rsatkichlari — bir joyda."
            />
            <DashboardTabs />
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
