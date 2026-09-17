import { KpiCard } from "./KpiCard";
import { formatDurationUz } from "@/lib/dashboard/format";
import type { DashboardKpis } from "@/lib/dashboard/kpi";

export function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Faol operatorlar"
        value={String(kpis.activeOperators.value)}
        deltaPercent={kpis.activeOperators.deltaPercent}
      />
      <KpiCard
        title="Jami vaqt"
        value={formatDurationUz(kpis.totalActiveMs.value)}
        deltaPercent={kpis.totalActiveMs.deltaPercent}
      />
      <KpiCard
        title="Nashr kutayotgan qoralamalar"
        value={String(kpis.draftCount.value)}
        deltaPercent={kpis.draftCount.deltaPercent}
        href="/dashboard/content"
      />
      <KpiCard
        title="Natijasiz qidiruvlar"
        value={String(kpis.zeroResultSearches.value)}
        deltaPercent={kpis.zeroResultSearches.deltaPercent}
        href="/dashboard/quality"
      />
    </div>
  );
}
