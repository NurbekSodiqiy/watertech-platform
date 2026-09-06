import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { objections } from "@/lib/mock-data/objections";

const columns: DbColumn[] = [
  { key: "objection", label: "E'tiroz", sortable: true },
  { key: "realMeaning", label: "Aslida nimani anglatadi" },
  { key: "answer1", label: "1-javob" },
  { key: "answer2", label: "2-javob" },
  { key: "badAnswer", label: "Noto'g'ri javob namunasi" },
  { key: "linkedCase", label: "Bog'langan holat" },
];

export default function ObjectionsPage() {
  const meta = getMockMeta("/sales-process/objections");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/objections"
        title="E'tirozlar"
        description="To'liq e'tirozlar bilan ishlash bazasi — nima deyiladi, bu nimani anglatadi va qanday javob berish kerak."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={objections} />
    </div>
  );
}
