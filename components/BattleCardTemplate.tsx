import { PageHeader } from "./DocPageTemplate";
import { FeedbackWidget } from "./FeedbackWidget";
import { StatusLockBadge } from "./StatusLockBadge";
import type { BattleCard } from "@/lib/mock-data/battle-cards";
import type { PageMeta } from "@/lib/types";

const outcomeLabels: Record<BattleCard["wonLostDeals"][number]["outcome"], string> = {
  Won: "Yutildi",
  Lost: "Yutqazildi",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-[16px] font-semibold text-primary-dark">{title}</h2>
      {children}
    </section>
  );
}

export function BattleCardTemplate({ card, meta }: { card: BattleCard; meta: PageMeta }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <PageHeader
        path={`/sales-process/battle-cards/${card.slug}`}
        title={`${card.competitor} bilan solishtirish`}
        description={`Eng kuchli tomon: ${card.strongSegment}`}
        meta={meta}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title={`Ularning kuchli tomonlari`}>
          <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] text-text-secondary">
            {card.theirStrengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Bizning kuchli tomonlarimiz (isbot bilan)">
          <ul className="space-y-2 text-[13.5px] text-text-secondary">
            {card.ourStrengths.map((s, i) => (
              <li key={i}>
                <span className="font-medium text-primary-dark">{s.point}</span>
                <br />
                <span className="text-primary">{s.proof}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="E'tiroz / Javob juftliklari">
        <div className="space-y-2">
          {card.objectionResponses.map((o, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-alt p-3 text-[13px]">
              <p className="font-medium text-primary-dark">{o.theirClaim}</p>
              <p className="mt-1 text-text-secondary">{o.response}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Hech qachon aytmaymiz">
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] text-status-outdated">
          {card.neverSay.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="So'nggi yutilgan / yutqazilgan bitimlar">
        <div className="mb-2">
          <StatusLockBadge label="Faqat menejerlar uchun" />
        </div>
        <div className="space-y-1.5">
          {card.wonLostDeals.map((d, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px]">
              <span className="text-primary-dark">{d.deal}</span>
              <span className={d.outcome === "Won" ? "font-medium text-status-ok" : "font-medium text-status-outdated"}>
                {outcomeLabels[d.outcome]}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <FeedbackWidget />
    </div>
  );
}
