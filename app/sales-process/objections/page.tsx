import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { objections } from "@/lib/mock-data/objections";

const columns: DbColumn[] = [
  { key: "objection", label: "E'tiroz", sortable: true },
  { key: "realMeaning", label: "Nima demoqchi" },
  { key: "response", label: "Javob" },
  { key: "followUp", label: "Qo'shimcha / keyingi qadam" },
  { key: "sourceScripts", label: "Qaysi skriptda" },
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

      <div className="flex items-start gap-3 rounded-2xl border border-status-warning/40 bg-status-warning/10 p-4">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-status-warning" />
        <p className="text-[13.5px] text-primary-dark">
          <strong>Muhim:</strong> "O'ylab ko'raman" yoki "Keyinroq telefon qilaman" kabi maqsadsiz javoblar hech
          qachon yakuniy javob sifatida qabul qilinmaydi — operator har doim aniqlashtiruvchi savol bilan davom
          ettirishi kerak.
        </p>
      </div>

      <DatabaseTemplate columns={columns} rows={objections} />
    </div>
  );
}
