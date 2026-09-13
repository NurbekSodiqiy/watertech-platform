import { notFound } from "next/navigation";
import { BattleCardTemplate } from "@/components/BattleCardTemplate";
import { getCompetitors } from "@/lib/content/loader";

// See the matching comment in scripts/[slug]/page.tsx: content lives in
// Supabase now, so this falls back to on-demand rendering when it can't be
// read at build time instead of failing the build.
export async function generateStaticParams() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const competitors = await getCompetitors();
    return competitors.map((c) => ({ slug: c.id }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

export default async function BattleCardPage({ params }: { params: { slug: string } }) {
  const competitors = await getCompetitors();
  const competitor = competitors.find((c) => c.id === params.slug);
  if (!competitor) notFound();

  return <BattleCardTemplate competitor={competitor} />;
}
