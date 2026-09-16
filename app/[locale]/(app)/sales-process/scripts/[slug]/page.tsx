import { unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ScriptTemplate } from "@/components/ScriptTemplate";
import { ScriptsContentProvider } from "@/components/scripts/ScriptsContentContext";
import { getScripts, getContentBundle } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

// Content now lives in Supabase, so generating params means reading it at
// build time. When SUPABASE_SERVICE_ROLE_KEY isn't configured (a fresh
// clone, CI without a reachable project — see README "Build requirements"),
// skip prerendering and let dynamicParams render each script on demand
// instead of failing the build.
export async function generateStaticParams() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const scripts = await getScripts();
    return scripts.map((s) => ({ slug: s.id }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

export default async function ScriptPage({
  params,
}: {
  params: { locale: Locale; slug: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const content = await getContentBundle(locale);
  const script = content.scripts.find((s) => s.id === params.slug);
  if (!script) notFound();

  return (
    <ScriptsContentProvider value={content}>
      <ScriptTemplate script={script} />
    </ScriptsContentProvider>
  );
}
