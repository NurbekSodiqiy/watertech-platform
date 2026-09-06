import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { battleCards } from "@/lib/mock-data/battle-cards";

const columns: DbColumn[] = [
  { key: "competitor", label: "Raqobatchi", sortable: true },
  { key: "strongSegment", label: "Eng kuchli segment" },
];

export default function BattleCardsPage() {
  const meta = getMockMeta("/sales-process/battle-cards");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/battle-cards"
        title="Raqobat kartalari"
        description="Har bir raqobatchi bo'yicha pozitsiya va javob berish qo'llanmasi."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={battleCards} linkBase="/sales-process/battle-cards" linkKey="slug" />
    </div>
  );
}
