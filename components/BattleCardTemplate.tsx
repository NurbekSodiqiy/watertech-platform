import { PageHeader } from "./PageHeader";
import { FeedbackWidget } from "./FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { CompetitorDetailPanel } from "./CompetitorDetailPanel";
import type { Competitor } from "@/lib/content/types";
import type { PageMeta } from "@/lib/types";

export function BattleCardTemplate({ competitor, meta }: { competitor: Competitor; meta?: PageMeta }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <PageHeader
        path={`/sales-process/battle-cards/${competitor.id}`}
        title={`${competitor.name} bilan solishtirish`}
        description={`Raqobat darajasi: ${competitor.threatLevel}`}
        meta={meta}
      />

      <CompetitorDetailPanel competitor={competitor} />

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
