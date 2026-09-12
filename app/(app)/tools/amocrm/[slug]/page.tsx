import { notFound } from "next/navigation";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { amoSops } from "@/lib/mock-data/amocrm";

export function generateStaticParams() {
  return amoSops.map((s) => ({ slug: s.slug }));
}

export default function AmoSopPage({ params }: { params: { slug: string } }) {
  const sop = amoSops.find((s) => s.slug === params.slug);
  if (!sop) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path={`/tools/amocrm/${params.slug}`}
        title={sop.title}
        description="Qisqa standart tartib-qoida"
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
