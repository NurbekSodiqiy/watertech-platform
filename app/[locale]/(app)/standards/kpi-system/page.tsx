import { unstable_setRequestLocale } from "next-intl/server";
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

const kpiRows: KpiRow[] = [
  {
    id: "calls-count",
    indicator: "Qo'ng'iroqlar soni",
    monthlyPlan: "1 350",
    dailyMeaning: "~50 ta/kun",
    weight: "15%",
    allocatedAmount: "300 000 so'm",
    note: "Bu shunchaki \"normativ\". Agar 1350 tadan kam bo'lsa, summa proporsional kamayadi. Operator kun bo'yi band bo'lishi uchun yetarli.",
  },
  {
    id: "calls-duration",
    indicator: "Qo'ng'iroqlar vaqti",
    monthlyPlan: "3 120 daqiqa",
    dailyMeaning: "~2 soat/kun",
    weight: "15%",
    allocatedAmount: "300 000 so'm",
    note: "Oylik umumiy suhbat davomiyligi shu ko'rsatkichga kiradi.",
  },
  {
    id: "sql-leads",
    indicator: "Tasdiqlangan Lidlar (SQL)",
    monthlyPlan: "25",
    dailyMeaning: "kamida 1 ta \"issiq\" mijoz/kun",
    weight: "70%",
    allocatedAmount: "1 400 000 so'm",
    note: "ENG MUHIM ko'rsatkich. Lid SQL hisoblanadi, qachonki Sotuv Menejeri mijoz bilan gaplashib, uning potensiali borligini tasdiqlab, CRM'da bosqichini o'zgartirsa.",
  },
];

const kpiColumns: DbColumn<KpiRow>[] = [
  { key: "indicator", label: "Ko'rsatkich" },
  { key: "monthlyPlan", label: "Oylik reja" },
  { key: "dailyMeaning", label: "Kunlik ma'nosi" },
  { key: "weight", label: "Og'irlik" },
  { key: "allocatedAmount", label: "Ajratilgan summa" },
  { key: "note", label: "Izoh", type: "longtext" },
];

interface BonusRow {
  id: string;
  indicator: string;
  monthlyPlan: string;
  note: string;
}

const bonusRows: BonusRow[] = [
  {
    id: "revenue-share-bonus",
    indicator: "Tushumdan ulush (bonus)",
    monthlyPlan: "500 000 000 so'm (umumiy savdo hajmi rejasi)",
    note: "Operator orqali o'tgan lidlarning yakuniy sotuv hajmidan 0.01% bonus sifatida to'lanadi.",
  },
];

const bonusColumns: DbColumn<BonusRow>[] = [
  { key: "indicator", label: "Ko'rsatkich" },
  { key: "monthlyPlan", label: "Oylik reja" },
  { key: "note", label: "Izoh", type: "longtext" },
];

const SALARY_PARTS = [
  { Icon: Wallet, label: "Oklad (Fix)", value: "60% — 3 000 000 so'm", note: "kafolatlangan qism" },
  { Icon: Percent, label: "KPI", value: "40% — 2 000 000 so'm", note: "quyidagi ko'rsatkichlar bajarilishiga bog'liq" },
  { Icon: Gift, label: "Sotuvdan bonus", value: "qo'shimcha daromad", note: undefined },
];

export default function KpiSystemPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/standards/kpi-system"
        title="KPI tizimi"
        description="Oylik maoshingiz qanday hisoblanishini va qaysi ko'rsatkichlarga bog'liqligini shu yerdan bilib oling."
      />

      {/* 1-qism: Oylik maosh tuzilishi */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-5">
        <h2 className="text-[17px] font-bold text-primary-dark">Sizning oylik maoshingiz tuzilishi</h2>
        <p className="text-[14px] leading-relaxed text-text-secondary">
          Sizning daromadingiz 3 qismdan iborat:
        </p>

        <div className="rounded-xl border border-border border-l-[3px] border-l-primary bg-primary-light/10 px-4 py-3">
          <p className="text-[14.5px] font-semibold text-primary-dark">
            Jami oylik = Oklad (Fiksa) + KPI (% savdodan) + Yo&apos;l xarajatlari
          </p>
        </div>

        <div className="space-y-3">
          {SALARY_PARTS.map(({ Icon, label, value, note }, i) => (
            <div key={label} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                <Icon size={20} />
              </div>
              <div>
                <div className="text-[14px] font-bold text-primary-dark">
                  {i + 1}. {label}
                </div>
                <div className="text-[14px] text-primary-dark">{value}</div>
                {note && <div className="text-[13px] text-text-secondary">{note}</div>}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[14px] leading-relaxed text-text-secondary">
          Quyidagi jadval orqali oylik maoshingiz qanday hisoblanishini batafsil ko&apos;rishingiz mumkin.
        </p>
      </div>

      {/* 2-qism: KPI ko'rsatkichlari jadvali */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">KPI ko&apos;rsatkichlari</h3>
        </div>
        <DatabaseTemplate columns={kpiColumns} rows={kpiRows} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Gift size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">
            Bonus: Tushumdan ulush
          </h3>
        </div>
        <DatabaseTemplate columns={bonusColumns} rows={bonusRows} />
      </div>

      {/* 3-qism: Qisqa eslatma */}
      <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-[13.5px] leading-relaxed text-text-secondary">
        Har bir ko&apos;rsatkichning bajarilish foizi CRM/dashboard orqali kuzatiladi. Yuqori bajarilish (taxminan
        90%+) — &quot;Yaxshi&quot; holat sifatida, past bajarilish esa e&apos;tibor talab qiladigan holat sifatida
        belgilanadi.
      </div>

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
