import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getCompetitors } from "@/lib/content/loader";
import type { Competitor } from "@/lib/content/types";

const columns: DbColumn<Competitor>[] = [
  { key: "name", label: "Raqobatchi", sortable: true },
  { key: "assortment", label: "Assortiment" },
  { key: "maxDiscount", label: "Jami maks. chegirma" },
  { key: "threatLevel", label: "Raqobat darajasi", sortable: true },
];

export default async function BattleCardsPage() {
  const competitors = await getCompetitors();
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/battle-cards"
        title="Raqobat kartalari"
        description="Har bir raqobatchi bo'yicha narx, chegirma va yetkazib berish shartlari."
      />
      <DatabaseTemplate columns={columns} rows={competitors} linkBase="/sales-process/battle-cards" />
    </div>
  );
}
