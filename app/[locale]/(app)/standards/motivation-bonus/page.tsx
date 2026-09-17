import { unstable_setRequestLocale } from "next-intl/server";
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

const motivationRows: MotivationRow[] = [
  {
    id: "zone-red-0",
    planLevel: "60% dan kam bajarilsa",
    coefficient: "0",
    zone: "🔴 Qizil",
    note: "Bu kompaniya uchun zararli ko'rsatkich. Agar xodim ketma-ket 2 oy \"Qizil zona\"da bo'lsa, uning kompaniyadagi faoliyati qayta ko'rib chiqiladi.",
  },
  {
    id: "zone-red-1",
    planLevel: "60–79,99% oralig'ida bajarilsa",
    coefficient: "0,5",
    zone: "🔴 Qizil",
    note: "—",
  },
  {
    id: "zone-mid",
    planLevel: "80–99,99% oralig'ida bajarilsa",
    coefficient: "0,75",
    zone: "🟡 O'rta",
    note: "—",
  },
  {
    id: "zone-excellent",
    planLevel: "100–119,9% oralig'ida bajarilsa",
    coefficient: "1",
    zone: "🟢 A'lo",
    note: "—",
  },
  {
    id: "zone-champion",
    planLevel: "120% va undan yuqori bajarilsa",
    coefficient: "1,2",
    zone: "🏆 Champion",
    note: "—",
  },
];

const motivationColumns: DbColumn<MotivationRow>[] = [
  { key: "planLevel", label: "Reja bajarilish darajasi" },
  { key: "coefficient", label: "Koeffitsient" },
  { key: "zone", label: "Zona" },
  { key: "note", label: "Izoh", type: "longtext" },
];

export default function MotivationBonusPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/standards/motivation-bonus"
        title="Motivatsiya va bonus"
        description="Reja bajarilish darajasiga qarab koeffitsient qanday belgilanishini shu yerdan bilib oling."
      />

      {/* Kirish bloki (Callout) — sales-funnel/repeat-sales-funnel
          sahifalarida allaqachon ishlatilgan uslub bilan bir xil. */}
      <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
        <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
          <Flag size={28} />
        </div>
        <div className="space-y-3">
          <h2 className="text-[16px] font-bold text-primary-dark">
            📌 KPI: Bizning &quot;O&apos;yin qoidalarimiz&quot;
          </h2>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            Sotuv bo&apos;limida ishlash — bu sportga o&apos;xshaydi. Natija qancha yuqori bo&apos;lsa, mukofot ham
            shuncha katta bo&apos;ladi. Bizda maosh <strong className="text-primary-dark font-bold">fiks (kafolatlangan qism)</strong> va{" "}
            <strong className="text-primary-dark font-bold">KPI, Bonus</strong>dan iborat.
          </p>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            Sizning daromadingiz quyidagi 4 ta chegara (porog) asosida hisoblanadi. Buni{" "}
            <strong className="text-primary-dark font-medium">Svetofor tizimi</strong> deb tushunishingiz mumkin:
          </p>
        </div>
      </div>

      {/* Jadval */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">Reja bajarilish darajasi va koeffitsient</h3>
        </div>
        <DatabaseTemplate columns={motivationColumns} rows={motivationRows} />
      </div>

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
