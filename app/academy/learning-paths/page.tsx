import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";

const steps = [
  { period: "1–30-kunlar", title: "Asoslar", items: ["[Joy egallovchi — mahsulot asoslari]", "[Joy egallovchi — CRM asoslari]", "[Joy egallovchi — 3 ta qo'ng'iroqni kuzatib borish]"], done: true },
  { period: "31–60-kunlar", title: "Amaliyot", items: ["[Joy egallovchi — birinchi mustaqil qo'ng'iroqlar]", "[Joy egallovchi — e'tirozlar bilan ishlash rolli o'yini]", "[Joy egallovchi — Bronza sertifikatidan o'tish]"], done: true },
  { period: "61–90-kunlar", title: "Mustaqillik", items: ["[Joy egallovchi — to'liq voronkani boshqarish]", "[Joy egallovchi — birinchi bitimni muzokara qilish]", "[Joy egallovchi — Kumush sertifikatidan o'tish]"], done: false },
];

export default function LearningPathsPage() {
  const meta = getMockMeta("/academy/learning-paths");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/learning-paths"
        title="O'quv yo'nalishlari"
        description="30-60-90 kunlik moslashuv yo'li."
        meta={meta}
      />
      <div className="space-y-0">
        {steps.map((s, i) => (
          <div key={s.period} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  s.done ? "bg-primary text-surface" : "border-2 border-primary-light bg-surface-alt text-primary"
                }`}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-8">
              <p className="text-[12px] font-medium uppercase tracking-wide text-primary-light">{s.period}</p>
              <h2 className="text-[16px] font-semibold text-primary-dark">{s.title}</h2>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-text-secondary">
                {s.items.map((it, j) => (
                  <li key={j}>• {it}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
