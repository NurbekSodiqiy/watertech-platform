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
        title="Funnel Map"
        description="Stage-by-stage view of the sales process: entry/exit conditions, actions, CRM fields, and linked resources."
        meta={meta}
      />
      <div className="space-y-3">
        {funnelStages.map((s) => (
          <div key={s.stage} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="mb-3 text-[16px] font-semibold text-primary-dark">{s.stage}</h2>
            <div className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="font-medium text-primary-dark">Entry condition</p><p className="text-text-secondary">{s.entryCondition}</p></div>
              <div><p className="font-medium text-primary-dark">Exit condition</p><p className="text-text-secondary">{s.exitCondition}</p></div>
              <div><p className="font-medium text-primary-dark">Actions</p><p className="text-text-secondary">{s.actions}</p></div>
              <div><p className="font-medium text-primary-dark">Required CRM fields</p><p className="text-text-secondary">{s.crmFields}</p></div>
              <div><p className="font-medium text-primary-dark">Linked script</p><p className="text-text-secondary">{s.linkedScript}</p></div>
              <div><p className="font-medium text-primary-dark">Linked template</p><p className="text-text-secondary">{s.linkedTemplate}</p></div>
            </div>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
