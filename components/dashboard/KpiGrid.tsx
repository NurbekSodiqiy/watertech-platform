import { getTranslations } from "next-intl/server";
import { KpiCard } from "./KpiCard";
import { formatDuration } from "@/lib/dashboard/format";
import type { DashboardKpis } from "@/lib/dashboard/kpi";

export async function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  const [t, tDuration] = await Promise.all([getTranslations("dashboard.kpi"), getTranslations("dashboard.duration")]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title={t("activeOperators")}
        value={String(kpis.activeOperators.value)}
        deltaPercent={kpis.activeOperators.deltaPercent}
      />
      <KpiCard
        title={t("totalTime")}
        value={formatDuration(kpis.totalActiveMs.value, tDuration)}
        deltaPercent={kpis.totalActiveMs.deltaPercent}
      />
      <KpiCard
        title={t("pendingDrafts")}
        value={String(kpis.draftCount.value)}
        deltaPercent={kpis.draftCount.deltaPercent}
        href="/dashboard/content"
      />
      <KpiCard
        title={t("zeroResults")}
        value={String(kpis.zeroResultSearches.value)}
        deltaPercent={kpis.zeroResultSearches.deltaPercent}
        href="/dashboard/quality"
      />
    </div>
  );
}
