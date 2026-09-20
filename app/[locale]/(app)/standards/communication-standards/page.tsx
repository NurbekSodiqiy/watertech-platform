import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";

interface Rule {
  num: string;
  /** Message key under rules.<key>; notes are rules.<key>.notes.1 … .notes.<noteCount>. */
  key: string;
  noteCount: number;
}

// Numbered-rule-card style reused verbatim from /tools/sales-funnel's
// STAGES list (number badge + connecting line + content card) — same
// component structure, just rule content instead of funnel stages.
const RULES: Rule[] = [
  { num: "01", key: "professionalCalls", noteCount: 1 },
  { num: "02", key: "crmRealTime", noteCount: 1 },
  { num: "03", key: "newLeadCallbacks", noteCount: 2 },
  { num: "04", key: "dailyCallMinimum", noteCount: 1 },
  { num: "05", key: "livelyScripts", noteCount: 1 },
  { num: "06", key: "complaintsByPhone", noteCount: 1 },
  { num: "07", key: "salesFunnel", noteCount: 1 },
  { num: "08", key: "respondWithinTenMinutes", noteCount: 1 },
  { num: "09", key: "callListening", noteCount: 1 },
  { num: "10", key: "updateKnowledge", noteCount: 1 },
  { num: "11", key: "externalSources", noteCount: 1 },
  { num: "12", key: "escalateFeedback", noteCount: 1 },
  { num: "13", key: "ongoingContact", noteCount: 2 },
  { num: "14", key: "discipline", noteCount: 1 },
];

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("standards.communicationStandards.title") };
}

export default async function CommunicationStandardsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [tNav, t] = await Promise.all([
    getTranslations("nav"),
    getTranslations("pages.standards.communicationStandards"),
  ]);

  const path = "/standards/communication-standards";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={tNav("standards.communicationStandards.title")}
      description={node?.description ? tNav(node.description) : undefined}
    >
      <div className="flex flex-col gap-5 relative">
        {/* Chiziq - visual pipeline effect (sales-funnel bilan bir xil) */}
        <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-border hidden sm:block"></div>

        {RULES.map((rule) => (
          <div key={rule.num} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group">
            {/* Number Badge */}
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-surface-alt font-mono text-[16px] font-bold text-primary-dark shadow-soft transition-colors group-hover:border-primary group-hover:bg-primary/10">
              {rule.num}
            </div>

            {/* Content Card */}
            <div className="flex-1 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
              <h4 className="text-[16px] font-bold text-primary-dark mb-2">{t(`rules.${rule.key}.title`)}</h4>
              <div className="space-y-1.5">
                {Array.from({ length: rule.noteCount }, (_, i) => (
                  <p key={i} className="text-[14px] leading-relaxed text-text-secondary">
                    {t(`rules.${rule.key}.notes.${i + 1}`)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DocPageTemplate>
  );
}
