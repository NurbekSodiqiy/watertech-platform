import { Award } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";

const tiers = [
  { name: "Bronze", color: "text-status-outdated", requirement: "[Placeholder — complete Basic modules + pass quiz]", earned: true },
  { name: "Silver", color: "text-text-secondary", requirement: "[Placeholder — complete Intermediate modules + 1 roleplay]", earned: true },
  { name: "Gold", color: "text-status-warning", requirement: "[Placeholder — complete Expert modules + manager sign-off]", earned: false },
];

export default function CertificationsPage() {
  const meta = getMockMeta("/academy/certifications");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/certifications"
        title="Certifications"
        description="Certification levels and what's required to earn each."
        meta={meta}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={`rounded-2xl border bg-surface p-5 text-center shadow-soft ${t.earned ? "border-primary-light" : "border-border opacity-70"}`}>
            <Award size={28} className={`mx-auto ${t.color}`} />
            <h2 className="mt-2 text-[16px] font-semibold text-primary-dark">{t.name}</h2>
            <p className="mt-1 text-[12.5px] text-text-secondary">{t.requirement}</p>
            <p className={`mt-2 text-[11px] font-semibold uppercase tracking-wide ${t.earned ? "text-status-ok" : "text-text-secondary"}`}>
              {t.earned ? "Earned" : "Not yet earned"}
            </p>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
