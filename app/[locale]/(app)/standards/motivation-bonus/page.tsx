import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Flag, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";

interface MotivationRow {
  id: string;
  planLevel: string;
  coefficient: string;
  zone: string;
  note: string;
}

// Coefficients are business numbers, identical in every locale, so they stay in
// code; only the wording lives in messages under rows.<id>. Rows without a
// note show the same dash the table always had.
const NO_NOTE = "—";
const ROWS = [
  { id: "zoneRed0", coefficient: "0", hasNote: true },
  { id: "zoneRed1", coefficient: "0,5", hasNote: false },
  { id: "zoneMid", coefficient: "0,75", hasNote: false },
  { id: "zoneExcellent", coefficient: "1", hasNote: false },
  { id: "zoneChampion", coefficient: "1,2", hasNote: false },
] as const;

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("standards.motivationBonus.title") };
}

export default async function MotivationBonusPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("pages.standards.motivationBonus")]);

  const motivationRows: MotivationRow[] = ROWS.map(({ id, coefficient, hasNote }) => ({
    id,
    planLevel: t(`rows.${id}.planLevel`),
    coefficient,
    zone: t(`rows.${id}.zone`),
    note: hasNote ? t(`rows.${id}.note`) : NO_NOTE,
  }));

  const motivationColumns: DbColumn<MotivationRow>[] = [
    { key: "planLevel", label: t("columns.planLevel") },
    { key: "coefficient", label: t("columns.coefficient") },
    { key: "zone", label: t("columns.zone") },
    { key: "note", label: t("columns.note"), type: "longtext" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/standards/motivation-bonus"
        title={tNav("standards.motivationBonus.title")}
        description={t("description")}
      />

      {/* Kirish bloki (Callout) — sales-funnel/repeat-sales-funnel
          sahifalarida allaqachon ishlatilgan uslub bilan bir xil. */}
      <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
        <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
          <Flag size={28} />
        </div>
        <div className="space-y-3">
          <h2 className="text-[16px] font-bold text-primary-dark">{t("intro.heading")}</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            {t.rich("intro.paragraph1", {
              strong: (chunks) => <strong className="text-primary-dark font-bold">{chunks}</strong>,
            })}
          </p>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            {t.rich("intro.paragraph2", {
              strong: (chunks) => <strong className="text-primary-dark font-medium">{chunks}</strong>,
            })}
          </p>
        </div>
      </div>

      {/* Jadval */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">{t("table.heading")}</h3>
        </div>
        <DatabaseTemplate columns={motivationColumns} rows={motivationRows} />
      </div>

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
