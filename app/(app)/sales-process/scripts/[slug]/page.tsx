import { notFound } from "next/navigation";
import { ScriptTemplate } from "@/components/ScriptTemplate";
import { ScriptsContentProvider } from "@/components/scripts/ScriptsContentContext";
import { getScripts, getContentBundle } from "@/lib/content/loader";

export async function generateStaticParams() {
  const scripts = await getScripts();
  return scripts.map((s) => ({ slug: s.id }));
}

export default async function ScriptPage({ params }: { params: { slug: string } }) {
  const content = await getContentBundle();
  const script = content.scripts.find((s) => s.id === params.slug);
  if (!script) notFound();

  return (
    <ScriptsContentProvider value={content}>
      <ScriptTemplate script={script} />
    </ScriptsContentProvider>
  );
}
