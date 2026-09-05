import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { caseStudies } from "@/lib/mock-data/case-studies";

const columns: DbColumn[] = [
  { key: "client", label: "Client", sortable: true },
  { key: "problem", label: "Problem" },
  { key: "resultNumber", label: "Result" },
  { key: "usedForObjection", label: "Used For Objection" },
];

export default function CaseStudiesPage() {
  const meta = getMockMeta("/customers/case-studies");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/customers/case-studies"
        title="Case Studies"
        description="Proof points to use in conversations and proposals."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={caseStudies} linkBase="/customers/case-studies" linkKey="slug" />
    </div>
  );
}
