import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { segments } from "@/lib/mock-data/segments";

const columns: DbColumn[] = [
  { key: "name", label: "Segment", sortable: true },
  { key: "decisionMakers", label: "Qaror qabul qiluvchilar" },
  { key: "buyingCycle", label: "Xarid davri" },
  { key: "avgDealSize", label: "O'rtacha bitim hajmi" },
  { key: "bestProduct", label: "Eng mos mahsulot" },
];

export default function SegmentsPage() {
  const meta = getMockMeta("/customers/segments");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/customers/segments"
        title="Mijoz segmentlari"
        description="Kimga sotamiz — xarid xatti-harakati bo'yicha taqsimlangan."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={segments} linkBase="/customers/segments" linkKey="slug" />
    </div>
  );
}
