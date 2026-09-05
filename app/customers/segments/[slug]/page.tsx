import { notFound } from "next/navigation";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";
import { segments } from "@/lib/mock-data/segments";

export function generateStaticParams() {
  return segments.map((s) => ({ slug: s.slug }));
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-full shrink-0 text-[13px] font-semibold text-primary-dark sm:w-44">{label}</dt>
      <dd className="text-[13.5px] text-text-secondary">{value}</dd>
    </div>
  );
}

export default function SegmentPage({ params }: { params: { slug: string } }) {
  const segment = segments.find((s) => s.slug === params.slug);
  if (!segment) notFound();

  const meta = getMockMeta(`/customers/segments/${params.slug}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path={`/customers/segments/${params.slug}`} title={segment.name} meta={meta} />
      <dl className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <Row label="Pains" value={<ul className="list-disc space-y-1 pl-4">{segment.pains.map((p, i) => <li key={i}>{p}</li>)}</ul>} />
        <Row label="Decision Makers" value={segment.decisionMakers} />
        <Row label="Buying Cycle" value={segment.buyingCycle} />
        <Row label="Avg. Deal Size" value={segment.avgDealSize} />
        <Row label="Best Product" value={segment.bestProduct} />
        <Row label="Best Argument" value={segment.bestArgument} />
        <Row label="Common Objection" value={segment.commonObjection} />
      </dl>
      <FeedbackWidget />
    </div>
  );
}
