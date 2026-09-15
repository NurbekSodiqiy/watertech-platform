import { unstable_setRequestLocale } from "next-intl/server";
import { ManagerMonitoringHeader } from "@/components/ManagerMonitoringHeader";
import { SessionProvider } from "@/components/providers/SessionProvider";

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
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
