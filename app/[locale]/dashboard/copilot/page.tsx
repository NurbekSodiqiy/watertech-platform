import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { requireAdminPage } from "@/lib/auth/server-session";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { CopilotKpiGrid } from "@/components/dashboard/CopilotKpiGrid";
import { CopilotUnansweredTable } from "@/components/dashboard/CopilotUnansweredTable";
import { DashboardWidgetError } from "@/components/dashboard/DashboardWidgetError";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchCopilotStats, fetchCopilotUnanswered } from "@/lib/dashboard/copilot-window";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "dashboard.metadata" });
  return { title: t("copilot") };
}

const BASE_PATH = "/dashboard/copilot";

export default async function DashboardCopilotPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);

  await requireAdminPage(locale);

  // The copilot log has no per-operator filter (an operator is only ever a
  // count here, never a name), so an ?op= left over from another tab is dropped.
  const range = { ...parseDashboardRange(searchParams), operatorEmail: null };
  const [stats, unanswered] = await Promise.all([fetchCopilotStats(range), fetchCopilotUnanswered(range)]);

  return (
    <div className="space-y-6">
      <RangePicker range={range} basePath={BASE_PATH} />

      {stats.ok ? <CopilotKpiGrid stats={stats.data} /> : <DashboardWidgetError />}

      {unanswered.ok ? <CopilotUnansweredTable items={unanswered.data} /> : <DashboardWidgetError />}
    </div>
  );
}
