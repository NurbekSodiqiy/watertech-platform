import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { scripts } from "@/lib/mock-data/scripts";

const columns: DbColumn[] = [
  { key: "title", label: "Skript", sortable: true },
  { key: "cheatSheet", label: "Qisqacha" },
];

export default function ScriptsPage() {
  const meta = getMockMeta("/sales-process/scripts");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/scripts"
        title="Skriptlar"
        description="Qo'ng'iroqlar uchun tayyor skriptlar — qisqacha xulosa va to'liq dialog bilan."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={scripts} linkBase="/sales-process/scripts" linkKey="slug" />
    </div>
  );
}
