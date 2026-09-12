import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { objections } from "@/lib/content/objections";
import { scripts } from "@/lib/content/scripts";

interface ObjectionRow {
  id: string;
  objection: string;
  realMeaning: string;
  response: string;
  followUp: string;
  sourceScripts: string;
}

const scriptNameById = new Map(scripts.map((s) => [s.id, s.name]));

const rows: ObjectionRow[] = objections.map((o) => ({
  id: o.id,
  objection: `"${o.clientSays}"`,
  realMeaning: o.realMeaning,
  response: o.response,
  followUp: o.followUp ?? "—",
  sourceScripts: o.scriptIds.map((id) => scriptNameById.get(id) ?? id).join(", "),
}));

const columns: DbColumn<ObjectionRow>[] = [
  { key: "objection", label: "E'tiroz", sortable: true, type: "longtext" },
  { key: "realMeaning", label: "Nima demoqchi", type: "longtext" },
  { key: "response", label: "Javob", type: "longtext" },
  { key: "followUp", label: "Qo'shimcha / keyingi qadam", type: "longtext" },
  { key: "sourceScripts", label: "Qaysi skriptda" },
];

export default function ObjectionsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/objections"
        title="E'tirozlar"
        description="To'liq e'tirozlar bilan ishlash bazasi — nima deyiladi, bu nimani anglatadi va qanday javob berish kerak."
      />

      <div className="flex items-start gap-3 rounded-2xl border border-status-warning/40 bg-status-warning/10 p-4">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-status-warning" />
        <p className="text-[13.5px] text-primary-dark">
          <strong>Muhim:</strong> &quot;O&apos;ylab ko&apos;raman&quot; yoki &quot;Keyinroq telefon qilaman&quot; kabi maqsadsiz javoblar hech
          qachon yakuniy javob sifatida qabul qilinmaydi — operator har doim aniqlashtiruvchi savol bilan davom
          ettirishi kerak.
        </p>
      </div>

      <DatabaseTemplate columns={columns} rows={rows} />
    </div>
  );
}
