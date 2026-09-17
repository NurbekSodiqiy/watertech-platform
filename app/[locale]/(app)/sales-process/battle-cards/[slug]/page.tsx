import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { BattleCardTemplate } from "@/components/BattleCardTemplate";
import { EmptyState } from "@/components/EmptyState";
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

export default async function BattleCardPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const competitors = await getCompetitors();
  const competitor = competitors.find((c) => c.id === params.slug);
  if (!competitor) {
    const t = await getTranslations("emptyState.scriptNotFound");
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <EmptyState
          stateKey="scriptNotFound"
          title={t("title", { type: t("typeCompetitor") })}
          reason={t("reason")}
          action={{ label: t("cta", { listName: t("listCompetitors") }), href: "/sales-process/battle-cards" }}
        />
      </div>
    );
  }

  return <BattleCardTemplate competitor={competitor} />;
}
