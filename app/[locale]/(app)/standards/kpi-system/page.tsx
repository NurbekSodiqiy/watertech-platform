import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Wallet, Percent, Gift, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";

interface KpiRow {
  id: string;
  indicator: string;
  monthlyPlan: string;
  dailyMeaning: string;
  weight: string;
  allocatedAmount: string;
  note: string;
}

interface BonusRow {
  id: string;
  indicator: string;
  monthlyPlan: string;
  note: string;
}

// Row ids double as message keys under rows.<id> / bonus.rows.<id>.
const KPI_ROW_IDS = ["callsCount", "callsDuration", "sqlLeads"] as const;
const BONUS_ROW_IDS = ["revenueShare"] as const;

const SALARY_PARTS = [
  { key: "fixed", Icon: Wallet, hasNote: true },
  { key: "kpi", Icon: Percent, hasNote: true },
  { key: "bonus", Icon: Gift, hasNote: false },
] as const;

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("standards.kpiSystem.title") };
}

export default async function KpiSystemPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("pages.standards.kpiSystem")]);

  const kpiRows: KpiRow[] = KPI_ROW_IDS.map((id) => ({
    id,
    indicator: t(`rows.${id}.indicator`),
    monthlyPlan: t(`rows.${id}.monthlyPlan`),
    dailyMeaning: t(`rows.${id}.dailyMeaning`),
    weight: t(`rows.${id}.weight`),
    allocatedAmount: t(`rows.${id}.allocatedAmount`),
    note: t(`rows.${id}.note`),
  }));

  const kpiColumns: DbColumn<KpiRow>[] = [
    { key: "indicator", label: t("columns.indicator") },
    { key: "monthlyPlan", label: t("columns.monthlyPlan") },
    { key: "dailyMeaning", label: t("columns.dailyMeaning") },
    { key: "weight", label: t("columns.weight") },
    { key: "allocatedAmount", label: t("columns.allocatedAmount") },
    { key: "note", label: t("columns.note"), type: "longtext" },
  ];

  const bonusRows: BonusRow[] = BONUS_ROW_IDS.map((id) => ({
    id,
    indicator: t(`bonus.rows.${id}.indicator`),
    monthlyPlan: t(`bonus.rows.${id}.monthlyPlan`),
    note: t(`bonus.rows.${id}.note`),
  }));

  const bonusColumns: DbColumn<BonusRow>[] = [
    { key: "indicator", label: t("columns.indicator") },
    { key: "monthlyPlan", label: t("columns.monthlyPlan") },
    { key: "note", label: t("columns.note"), type: "longtext" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/standards/kpi-system"
        title={tNav("standards.kpiSystem.title")}
        description={t("description")}
      />

      {/* 1-qism: Oylik maosh tuzilishi */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-5">
        <h2 className="text-[17px] font-bold text-primary-dark">{t("salary.heading")}</h2>
        <p className="text-[14px] leading-relaxed text-text-secondary">{t("salary.intro")}</p>

        <div className="rounded-xl border border-border border-l-[3px] border-l-primary bg-primary-light/10 px-4 py-3">
          <p className="text-[14.5px] font-semibold text-primary-dark">{t("salary.formula")}</p>
        </div>

        <div className="space-y-3">
          {SALARY_PARTS.map(({ key, Icon, hasNote }, i) => (
            <div key={key} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                <Icon size={20} />
              </div>
              <div>
                <div className="text-[14px] font-bold text-primary-dark">
                  {i + 1}. {t(`salary.parts.${key}.label`)}
                </div>
                <div className="text-[14px] text-primary-dark">{t(`salary.parts.${key}.value`)}</div>
                {hasNote && <div className="text-[13px] text-text-secondary">{t(`salary.parts.${key}.note`)}</div>}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[14px] leading-relaxed text-text-secondary">{t("salary.outro")}</p>
      </div>

      {/* 2-qism: KPI ko'rsatkichlari jadvali */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">{t("kpi.heading")}</h3>
        </div>
        <DatabaseTemplate columns={kpiColumns} rows={kpiRows} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Gift size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">{t("bonus.heading")}</h3>
        </div>
        <DatabaseTemplate columns={bonusColumns} rows={bonusRows} />
      </div>

      {/* 3-qism: Qisqa eslatma */}
      <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-[13.5px] leading-relaxed text-text-secondary">
        {t("footnote")}
      </div>

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
