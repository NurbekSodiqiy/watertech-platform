import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { Info, Zap, CheckCircle2 } from "lucide-react";

export default async function SalesFunnelPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.tools.salesFunnel");

  const path = "/tools/sales-funnel";
  const node = findNode(path);

  // Wording lives in messages under stages.<id>; only the order, the numbering
  // and which optional callouts a stage has stay here.
  const STAGES = [
    { id: "newLead", num: "01", hasReq: true, hasTrigger: false },
    { id: "noAnswer", num: "02", hasReq: false, hasTrigger: true },
    { id: "infoGiven", num: "03", hasReq: false, hasTrigger: false },
    { id: "thinking", num: "04", hasReq: false, hasTrigger: false },
    { id: "sampleToSend", num: "05", hasReq: false, hasTrigger: false },
    { id: "sampleSent", num: "06", hasReq: false, hasTrigger: false },
    { id: "meetingSet", num: "07", hasReq: false, hasTrigger: true },
    { id: "meetingDone", num: "08", hasReq: false, hasTrigger: false },
    { id: "negotiation", num: "09", hasReq: false, hasTrigger: false },
    { id: "agreed", num: "10", hasReq: false, hasTrigger: false },
  ] as const;

  return (
    <DocPageTemplate
      path={path}
      title={t("title")}
      description={node?.description}
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
                status: (chunks) => <strong className="text-primary-dark font-medium">{chunks}</strong>,
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
                  <h4 className="text-[17px] font-bold text-primary-dark mb-2">
                    {t(`stages.${stage.id}.title`)}
                  </h4>
                  <p className="text-[14.5px] leading-relaxed text-text-secondary">
                    {t(`stages.${stage.id}.desc`)}
                  </p>
                  
                  {stage.hasReq && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-alt p-3.5 border border-border/50">
                      <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">{t("requirementLabel")}</span> {t(`stages.${stage.id}.req`)}
                      </p>
                    </div>
                  )}

                  {stage.hasTrigger && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/10 p-3.5 border border-primary/20">
                      <Zap size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">{t("triggerLabel")}</span> {t(`stages.${stage.id}.trigger`)}
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
