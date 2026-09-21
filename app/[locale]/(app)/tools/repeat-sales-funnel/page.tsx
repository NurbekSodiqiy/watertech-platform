import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { Info, Zap, RefreshCw, XCircle } from "lucide-react";

export default async function RepeatSalesFunnelPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.tools.repeatSalesFunnel");

  const path = "/tools/repeat-sales-funnel";

  // Wording lives in messages under stages.<id>; only the order, the numbering
  // and which optional callouts a stage has stay here.
  const STAGES = [
    { id: "client", num: "01", hasTrigger: true, hasCyclic: false, fail: false },
    { id: "offerSent", num: "02", hasTrigger: false, hasCyclic: false, fail: false },
    { id: "negotiation", num: "03", hasTrigger: false, hasCyclic: false, fail: false },
    { id: "agreed", num: "04", hasTrigger: false, hasCyclic: false, fail: false },
    { id: "won", num: "05", hasTrigger: false, hasCyclic: true, fail: false },
    { id: "lost", num: "06", hasTrigger: false, hasCyclic: false, fail: true },
  ] as const;

  return (
    <DocPageTemplate
      path={path}
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-8">
        
        {/* Kirish bloki (Callout) */}
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
          <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
            <Info size={28} />
          </div>
          <div>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              {t.rich("intro", {
                term: (chunks) => <strong className="text-primary-dark font-bold">{chunks}</strong>,
              })}
            </p>
          </div>
        </div>

        {/* Voronka bosqichlari */}
        <div className="space-y-6">
          <h3 className="text-[18px] font-bold text-primary-dark border-b border-border pb-3">
            {t("stagesHeading")}
          </h3>
          
          <div className="flex flex-col gap-5 relative">
            {/* Chiziq - visual pipeline effect */}
            <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-border hidden sm:block"></div>

            {STAGES.map((stage) => (
              <div key={stage.num} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group">
                
                {/* Number Badge */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-surface-alt font-mono text-[16px] font-bold text-primary-dark shadow-soft transition-colors group-hover:border-primary group-hover:bg-primary/10">
                  {stage.num}
                </div>

                {/* Content Card */}
                <div className="flex-1 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="text-[17px] font-bold text-primary-dark">
                      {t(`stages.${stage.id}.title`)}
                    </h4>
                    {stage.fail && (
                      <XCircle size={20} className="text-text-secondary shrink-0" />
                    )}
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-text-secondary">
                    {t(`stages.${stage.id}.desc`)}
                  </p>

                  {stage.hasTrigger && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/10 p-3.5 border border-primary/20">
                      <Zap size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">{t("triggerLabel")}</span> {t(`stages.${stage.id}.trigger`)}
                      </p>
                    </div>
                  )}

                  {stage.hasCyclic && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-alt p-3.5 border border-border/50">
                      <RefreshCw size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">{t("cyclicLabel")}</span> {t(`stages.${stage.id}.cyclic`)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DocPageTemplate>
  );
}
