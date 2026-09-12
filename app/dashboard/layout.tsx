import { ManagerMonitoringHeader } from "@/components/ManagerMonitoringHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ManagerMonitoringHeader />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
