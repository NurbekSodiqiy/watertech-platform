import { notFound } from "next/navigation";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";
import { amoSops } from "@/lib/mock-data/amocrm";

export function generateStaticParams() {
  return amoSops.map((s) => ({ slug: s.slug }));
}

export default function AmoSopPage({ params }: { params: { slug: string } }) {
  const sop = amoSops.find((s) => s.slug === params.slug);
  if (!sop) notFound();

  const meta = getMockMeta(`/tools/amocrm/${params.slug}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path={`/tools/amocrm/${params.slug}`}
        title={sop.title}
        description="Mini standard operating procedure"
        meta={meta}
      />
      <ol className="space-y-3">
        {sop.steps.map((s) => (
          <li key={s.step} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
              {s.step}
            </span>
            <div>
              <p className="text-[13.5px] text-primary-dark">{s.action}</p>
              <p className="mt-0.5 text-[12.5px] italic text-text-secondary">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>
      <FeedbackWidget />
    </div>
  );
}
