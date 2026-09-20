import { PageHeader } from "./PageHeader";
import { FeedbackWidget } from "./FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { PinButton } from "@/components/ui/PinButton";
import { RecentRecorder } from "@/components/ui/RecentRecorder";
import { CompetitorDetailPanel } from "./CompetitorDetailPanel";
import type { Competitor } from "@/lib/content/types";
import type { PageMeta } from "@/lib/types";

export function BattleCardTemplate({ competitor, meta }: { competitor: Competitor; meta?: PageMeta }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <RecentRecorder kind="battleCard" id={competitor.id} />

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <PageHeader
            path={`/sales-process/battle-cards/${competitor.id}`}
            title={`${competitor.name} bilan solishtirish`}
            description={`Raqobat darajasi: ${competitor.threatLevel}`}
            meta={meta}
          />
        </div>
        {/* Lines up with the title: breadcrumb row (20px) + the header's 16px gap. */}
        <PinButton kind="battleCard" id={competitor.id} className="mt-9" />
      </div>

      <CompetitorDetailPanel competitor={competitor} />

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
