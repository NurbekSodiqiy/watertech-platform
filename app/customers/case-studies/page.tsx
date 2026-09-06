import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { caseStudies } from "@/lib/mock-data/case-studies";

const columns: DbColumn[] = [
  { key: "client", label: "Mijoz", sortable: true },
  { key: "problem", label: "Muammo" },
  { key: "resultNumber", label: "Natija" },
  { key: "usedForObjection", label: "Qaysi e'tiroz uchun" },
];

export default function CaseStudiesPage() {
  const meta = getMockMeta("/customers/case-studies");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/customers/case-studies"
        title="Amaliy holatlar"
        description="Suhbat va takliflarda ishlatiladigan isbot nuqtalari."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={caseStudies} linkBase="/customers/case-studies" linkKey="slug" />
    </div>
  );
}
