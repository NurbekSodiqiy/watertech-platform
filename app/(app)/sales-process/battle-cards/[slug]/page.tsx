import { notFound } from "next/navigation";
import { BattleCardTemplate } from "@/components/BattleCardTemplate";
import { getCompetitors } from "@/lib/content/loader";

export async function generateStaticParams() {
  const competitors = await getCompetitors();
  return competitors.map((c) => ({ slug: c.id }));
}

export default async function BattleCardPage({ params }: { params: { slug: string } }) {
  const competitors = await getCompetitors();
  const competitor = competitors.find((c) => c.id === params.slug);
  if (!competitor) notFound();

  return <BattleCardTemplate competitor={competitor} />;
}
