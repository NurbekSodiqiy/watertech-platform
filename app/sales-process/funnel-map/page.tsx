import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";
import { funnelStages } from "@/lib/mock-data/funnel";

export default function FunnelMapPage() {
  const meta = getMockMeta("/sales-process/funnel-map");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/funnel-map"
        title="Voronka xaritasi"
        description="Savdo jarayonining bosqichma-bosqich ko'rinishi: kirish/chiqish shartlari, harakatlar, CRM maydonlari va bog'langan resurslar."
        meta={meta}
      />
      <div className="space-y-3">
        {funnelStages.map((s) => (
          <div key={s.stage} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="mb-3 text-[16px] font-semibold text-primary-dark">{s.stage}</h2>
            <div className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="font-medium text-primary-dark">Kirish sharti</p><p className="text-text-secondary">{s.entryCondition}</p></div>
              <div><p className="font-medium text-primary-dark">Chiqish sharti</p><p className="text-text-secondary">{s.exitCondition}</p></div>
              <div><p className="font-medium text-primary-dark">Harakatlar</p><p className="text-text-secondary">{s.actions}</p></div>
              <div><p className="font-medium text-primary-dark">Kerakli CRM maydonlari</p><p className="text-text-secondary">{s.crmFields}</p></div>
              <div><p className="font-medium text-primary-dark">Bog'langan skript</p><p className="text-text-secondary">{s.linkedScript}</p></div>
              <div><p className="font-medium text-primary-dark">Bog'langan shablon</p><p className="text-text-secondary">{s.linkedTemplate}</p></div>
            </div>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
