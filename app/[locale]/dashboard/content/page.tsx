import { unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/auth/server-session";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { OperatorFilter } from "@/components/dashboard/OperatorFilter";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { ContentHealthPanel } from "@/components/dashboard/ContentHealthPanel";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchDashboardTelemetry } from "@/lib/dashboard/telemetry-window";
import { getContentHealth } from "@/lib/dashboard/content-health";

export const metadata = { title: "Rahbariyat monitoring — Kontent" };

const BASE_PATH = "/dashboard/content";

export default async function DashboardContentPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);

  const session = await getServerSession();
  if (!session || session.role !== "manager") redirect({ href: "/", locale });

  if (process.env.NODE_ENV !== "production") console.time("[dashboard] Kontent render");

  const range = parseDashboardRange(searchParams);
  const [{ kpis }, health] = await Promise.all([fetchDashboardTelemetry(range), getContentHealth()]);

  if (process.env.NODE_ENV !== "production") console.timeEnd("[dashboard] Kontent render");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker range={range} basePath={BASE_PATH} />
        <OperatorFilter range={range} basePath={BASE_PATH} />
      </div>

      <KpiGrid kpis={kpis} />

      <ContentHealthPanel health={health} />
    </div>
  );
}
