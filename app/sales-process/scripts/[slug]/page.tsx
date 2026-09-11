import { notFound } from "next/navigation";
import { ScriptTemplate } from "@/components/ScriptTemplate";
import { scripts } from "@/lib/content/scripts";

export function generateStaticParams() {
  return scripts.map((s) => ({ slug: s.id }));
}

export default function ScriptPage({ params }: { params: { slug: string } }) {
  const script = scripts.find((s) => s.id === params.slug);
  if (!script) notFound();

  return <ScriptTemplate script={script} />;
}
