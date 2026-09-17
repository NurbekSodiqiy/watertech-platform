import { unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/auth/server-session";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { OperatorFilter } from "@/components/dashboard/OperatorFilter";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { QualityPanel } from "@/components/dashboard/QualityPanel";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchDashboardTelemetry } from "@/lib/dashboard/telemetry-window";
import { filterRows } from "@/lib/telemetry/aggregate";
import { aggregateNotHelpful, aggregateZeroResultQueriesDetailed, aggregateMostViewed } from "@/lib/dashboard/quality";

export const metadata = { title: "Rahbariyat monitoring — Sifat" };

const BASE_PATH = "/dashboard/quality";

export default async function DashboardQualityPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);

  const session = await getServerSession();
  if (!session || session.role !== "manager") redirect({ href: "/", locale });

  if (process.env.NODE_ENV !== "production") console.time("[dashboard] Sifat render");

  const range = parseDashboardRange(searchParams);
  const { currentRows, labelMaps, kpis } = await fetchDashboardTelemetry(range);
  const rows = filterRows(currentRows, { operatorEmail: range.operatorEmail });

  const notHelpful = aggregateNotHelpful(rows);
  const zeroResultQueries = aggregateZeroResultQueriesDetailed(rows);
  const mostViewed = aggregateMostViewed(rows, labelMaps);

  if (process.env.NODE_ENV !== "production") console.timeEnd("[dashboard] Sifat render");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker range={range} basePath={BASE_PATH} />
        <OperatorFilter range={range} basePath={BASE_PATH} />
      </div>

      <KpiGrid kpis={kpis} />

      <QualityPanel notHelpful={notHelpful} zeroResultQueries={zeroResultQueries} mostViewed={mostViewed} />
    </div>
  );
}
