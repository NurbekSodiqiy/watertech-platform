import { notFound } from "next/navigation";
import { BattleCardTemplate } from "@/components/BattleCardTemplate";
import { getMockMeta } from "@/lib/site-config";
import { battleCards } from "@/lib/mock-data/battle-cards";

export function generateStaticParams() {
  return battleCards.map((c) => ({ slug: c.slug }));
}

export default function BattleCardPage({ params }: { params: { slug: string } }) {
  const card = battleCards.find((c) => c.slug === params.slug);
  if (!card) notFound();

  const meta = getMockMeta(`/sales-process/battle-cards/${params.slug}`);
  return <BattleCardTemplate card={card} meta={meta} />;
}
