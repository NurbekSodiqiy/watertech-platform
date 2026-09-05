import { notFound } from "next/navigation";
import { ScriptTemplate } from "@/components/ScriptTemplate";
import { getMockMeta } from "@/lib/site-config";
import { scripts } from "@/lib/mock-data/scripts";

export function generateStaticParams() {
  return scripts.map((s) => ({ slug: s.slug }));
}

export default function ScriptPage({ params }: { params: { slug: string } }) {
  const script = scripts.find((s) => s.slug === params.slug);
  if (!script) notFound();

  const meta = getMockMeta(`/sales-process/scripts/${params.slug}`);
  return <ScriptTemplate script={script} meta={meta} />;
}
