import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/auth/server-session";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { OperatorFilter } from "@/components/dashboard/OperatorFilter";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { QualityPanel } from "@/components/dashboard/QualityPanel";
import { OnboardingProgressTable } from "@/components/dashboard/OnboardingProgressTable";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchDashboardTelemetry } from "@/lib/dashboard/telemetry-window";
import { filterRows } from "@/lib/telemetry/aggregate";
import {
  aggregateNotHelpful,
  aggregateZeroResultQueriesDetailed,
  aggregateMostViewed,
  fetchOnboardingProgress,
} from "@/lib/dashboard/quality";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "dashboard.metadata" });
  return { title: t("quality") };
}

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
  // Not derived from telemetry like the three above — onboarding progress is
  // the operators' own user_state rows, read here under the manager policy in
  // 0009_user_state.sql. It honours the operator filter but not the date
  // range: the checklist is a running total, not an activity window.
  const onboardingProgress = await fetchOnboardingProgress(range.operatorEmail);

  if (process.env.NODE_ENV !== "production") console.timeEnd("[dashboard] Sifat render");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker range={range} basePath={BASE_PATH} />
        <OperatorFilter range={range} basePath={BASE_PATH} />
      </div>

      <KpiGrid kpis={kpis} />

      <QualityPanel notHelpful={notHelpful} zeroResultQueries={zeroResultQueries} mostViewed={mostViewed} />

      <OnboardingProgressTable rows={onboardingProgress} />
    </div>
  );
}
