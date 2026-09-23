import { getTranslations } from "next-intl/server";
import { KpiCard } from "./KpiCard";
import { formatLatency, formatRate, type CopilotStatsSummary } from "@/lib/dashboard/copilot";

/** The copilot tab's four cards. No delta: copilot_stats answers one window,
 * so KpiCard's percentage renders its "—". */
export async function CopilotKpiGrid({ stats }: { stats: CopilotStatsSummary }) {
  const [t, tLatency] = await Promise.all([
    getTranslations("dashboard.copilot.kpi"),
    getTranslations("dashboard.copilot.latency"),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard title={t("requests")} value={String(stats.total)} deltaPercent={null} />
      <KpiCard title={t("noHitsRate")} value={formatRate(stats.noHitsRate)} deltaPercent={null} />
      <KpiCard title={t("errorRate")} value={formatRate(stats.errorRate)} deltaPercent={null} />
      <KpiCard
        title={t("latency")}
        value={`${formatLatency(stats.p50Ms, tLatency)} / ${formatLatency(stats.p95Ms, tLatency)}`}
        deltaPercent={null}
      />
    </div>
  );
}
