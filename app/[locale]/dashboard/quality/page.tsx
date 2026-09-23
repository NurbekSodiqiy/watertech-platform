import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/auth/server-session";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { OperatorFilter } from "@/components/dashboard/OperatorFilter";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { QualityPanel } from "@/components/dashboard/QualityPanel";
import { OnboardingProgressTable } from "@/components/dashboard/OnboardingProgressTable";
import { DashboardWidgetError } from "@/components/dashboard/DashboardWidgetError";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchDashboardKpis, fetchQualityTelemetry } from "@/lib/dashboard/telemetry-window";
import { fetchOnboardingProgress } from "@/lib/dashboard/quality";

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
  const [kpis, quality, onboardingProgress] = await Promise.all([
    fetchDashboardKpis(range),
    fetchQualityTelemetry(range),
    // Not derived from telemetry like the quality lists — onboarding progress
    // is the operators' own user_state rows, read here under the manager
    // policy in 0009_user_state.sql. It honours the operator filter but not the
    // date range: the checklist is a running total, not an activity window.
    fetchOnboardingProgress(range.operatorEmail),
  ]);

  if (process.env.NODE_ENV !== "production") console.timeEnd("[dashboard] Sifat render");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker range={range} basePath={BASE_PATH} />
        <OperatorFilter range={range} basePath={BASE_PATH} />
      </div>

      {kpis.ok ? <KpiGrid kpis={kpis.data} /> : <DashboardWidgetError />}

      {quality.ok ? (
        <QualityPanel
          notHelpful={quality.data.notHelpful}
          zeroResultQueries={quality.data.zeroResultQueries}
          mostViewed={quality.data.mostViewed}
        />
      ) : (
        <DashboardWidgetError />
      )}

      <OnboardingProgressTable rows={onboardingProgress} />
    </div>
  );
}
