import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getCompetitors } from "@/lib/content/loader";
import type { Competitor } from "@/lib/content/types";

export default async function BattleCardsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [t, tNav, tPage] = await Promise.all([
    getTranslations("emptyState.battleCardsNone"),
    getTranslations("nav"),
    getTranslations("pages.salesProcess.battleCards"),
  ]);

  const columns: DbColumn<Competitor>[] = [
    { key: "name", label: tPage("columns.name"), sortable: true },
    { key: "assortment", label: tPage("columns.assortment") },
    { key: "maxDiscount", label: tPage("columns.maxDiscount") },
    { key: "threatLevel", label: tPage("columns.threatLevel"), sortable: true },
  ];

  const competitors = await getCompetitors();
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/battle-cards"
        title={tNav("salesProcess.battleCards.title")}
        description={tPage("description")}
      />
      <DatabaseTemplate
        columns={columns}
        rows={competitors}
        linkBase="/sales-process/battle-cards"
        emptyState={{
          stateKey: "battleCardsNone",
          title: t("title"),
          reason: t("reason"),
          cta: { kind: "open-search", label: t("cta") },
        }}
      />
    </div>
  );
}
