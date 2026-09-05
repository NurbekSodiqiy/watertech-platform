import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { segments } from "@/lib/mock-data/segments";

const columns: DbColumn[] = [
  { key: "name", label: "Segment", sortable: true },
  { key: "decisionMakers", label: "Decision Makers" },
  { key: "buyingCycle", label: "Buying Cycle" },
  { key: "avgDealSize", label: "Avg. Deal Size" },
  { key: "bestProduct", label: "Best Product" },
];

export default function SegmentsPage() {
  const meta = getMockMeta("/customers/segments");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/customers/segments"
        title="Customer Segments"
        description="Who we sell to, broken down by buying behavior."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={segments} linkBase="/customers/segments" linkKey="slug" />
    </div>
  );
}
