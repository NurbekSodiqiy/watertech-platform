import { Award } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";

const tiers = [
  { name: "Bronza", color: "text-status-outdated", requirement: "[Joy egallovchi — Boshlang'ich modullarni tugatish + testdan o'tish]", earned: true },
  { name: "Kumush", color: "text-text-secondary", requirement: "[Joy egallovchi — O'rta modullarni tugatish + 1 ta rolli o'yin]", earned: true },
  { name: "Oltin", color: "text-status-warning", requirement: "[Joy egallovchi — Ekspert modullarni tugatish + menejer tasdig'i]", earned: false },
];

export default function CertificationsPage() {
  const meta = getMockMeta("/academy/certifications");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/certifications"
        title="Sertifikatlar"
        description="Sertifikat darajalari va har birini olish uchun talablar."
        meta={meta}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={`rounded-2xl border bg-surface p-5 text-center shadow-soft ${t.earned ? "border-primary-light" : "border-border opacity-70"}`}>
            <Award size={28} className={`mx-auto ${t.color}`} />
            <h2 className="mt-2 text-[16px] font-semibold text-primary-dark">{t.name}</h2>
            <p className="mt-1 text-[12.5px] text-text-secondary">{t.requirement}</p>
            <p className={`mt-2 text-[11px] font-semibold uppercase tracking-wide ${t.earned ? "text-status-ok" : "text-text-secondary"}`}>
              {t.earned ? "Olingan" : "Hali olinmagan"}
            </p>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
