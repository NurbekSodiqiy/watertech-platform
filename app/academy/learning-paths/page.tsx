import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";

const steps = [
  { period: "Days 1–30", title: "Foundations", items: ["[Placeholder — product fundamentals]", "[Placeholder — CRM basics]", "[Placeholder — shadow 3 calls]"], done: true },
  { period: "Days 31–60", title: "Practice", items: ["[Placeholder — run first solo calls]", "[Placeholder — objection handling roleplay]", "[Placeholder — pass Bronze certification]"], done: true },
  { period: "Days 61–90", title: "Independence", items: ["[Placeholder — own a full pipeline]", "[Placeholder — negotiate first deal]", "[Placeholder — pass Silver certification]"], done: false },
];

export default function LearningPathsPage() {
  const meta = getMockMeta("/academy/learning-paths");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/learning-paths"
        title="Learning Paths"
        description="The 30-60-90 day onboarding path."
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
