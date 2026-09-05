import { notFound } from "next/navigation";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";
import { caseStudies } from "@/lib/mock-data/case-studies";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const study = caseStudies.find((c) => c.slug === params.slug);
  if (!study) notFound();

  const meta = getMockMeta(`/customers/case-studies/${params.slug}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path={`/customers/case-studies/${params.slug}`} title={study.client} meta={meta} />
      <div className="space-y-4">
        {[
          ["Problem", study.problem],
          ["Solution", study.solution],
          ["Result", study.resultNumber],
          ["Used to counter objection", study.usedForObjection],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="mb-1.5 text-[15px] font-semibold text-primary-dark">{label}</h2>
            <p className="text-[13.5px] text-text-secondary">{value}</p>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
