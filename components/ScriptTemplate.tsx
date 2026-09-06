import { PlayCircle } from "lucide-react";
import { PageHeader } from "./DocPageTemplate";
import { FeedbackWidget } from "./FeedbackWidget";
import type { SalesScript } from "@/lib/mock-data/scripts";
import type { PageMeta } from "@/lib/types";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-[16px] font-semibold text-primary-dark">{title}</h2>
      {children}
    </section>
  );
}

function QList({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-[13.5px] text-text-secondary">
      {items.map((q, i) => (
        <li key={i}>{q}</li>
      ))}
    </ol>
  );
}

export function ScriptTemplate({ script, meta }: { script: SalesScript; meta: PageMeta }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <PageHeader
        path={`/sales-process/scripts/${script.slug}`}
        title={script.title}
        description="SPIN uslubidagi qo'ng'iroq skripti"
        meta={meta}
      />

      <Block title="Maqsad va muvaffaqiyat mezoni">
        <p className="text-[13.5px] text-text-secondary"><strong className="text-primary-dark">Maqsad:</strong> {script.goal}</p>
        <p className="text-[13.5px] text-text-secondary"><strong className="text-primary-dark">Muvaffaqiyat:</strong> {script.successCriteria}</p>
      </Block>

      <Block title="Kirish qismi">
        <p className="text-[13.5px] text-text-secondary">{script.opening}</p>
      </Block>

      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="Vaziyat savollari">
          <QList items={script.situationQuestions} />
        </Block>
        <Block title="Muammo savollari">
          <QList items={script.problemQuestions} />
        </Block>
        <Block title="Oqibat savollari">
          <QList items={script.implicationQuestions} />
        </Block>
        <Block title="Ehtiyoj-natija savollari">
          <QList items={script.needPayoffQuestions} />
        </Block>
      </div>

      <Block title="Taqdimot">
        <p className="text-[13.5px] text-text-secondary">{script.presentationBlock}</p>
      </Block>

      <Block title="Keyingi qadam bo'yicha kelishuv">
        <p className="text-[13.5px] text-text-secondary">{script.nextStepCommitment}</p>
      </Block>

      <Block title="Qilmang">
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] text-status-outdated">
          {script.dontDo.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </Block>

      <Block title="Namuna yozuv">
        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
          <PlayCircle size={26} />
        </div>
      </Block>

      <FeedbackWidget />
    </div>
  );
}
