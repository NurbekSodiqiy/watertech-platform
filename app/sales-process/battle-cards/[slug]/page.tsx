import { notFound } from "next/navigation";
import { BattleCardTemplate } from "@/components/BattleCardTemplate";
import { competitors } from "@/lib/content/competitors";

export function generateStaticParams() {
  return competitors.map((c) => ({ slug: c.id }));
}

export default function BattleCardPage({ params }: { params: { slug: string } }) {
  const competitor = competitors.find((c) => c.id === params.slug);
  if (!competitor) notFound();

  return <BattleCardTemplate competitor={competitor} />;
}
