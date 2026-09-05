import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { objections } from "@/lib/mock-data/objections";

const columns: DbColumn[] = [
  { key: "objection", label: "Objection", sortable: true },
  { key: "realMeaning", label: "What They Really Mean" },
  { key: "answer1", label: "Answer 1" },
  { key: "answer2", label: "Answer 2" },
  { key: "badAnswer", label: "Bad Answer Example" },
  { key: "linkedCase", label: "Linked Case" },
];

export default function ObjectionsPage() {
  const meta = getMockMeta("/sales-process/objections");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/objections"
        title="Objections"
        description="The full objection-handling database — what's said, what it means, and how to respond."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={objections} />
    </div>
  );
}
