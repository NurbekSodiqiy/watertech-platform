import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { faqItems } from "@/lib/mock-data/faq";

const columns: DbColumn[] = [
  { key: "question", label: "Savol", sortable: true },
  { key: "answer", label: "Javob" },
  { key: "sourcePage", label: "Manba sahifa", type: "link" },
  { key: "timesAsked", label: "So'ralgan soni", sortable: true },
  { key: "lastUpdated", label: "Yangilangan" },
];

export default function FaqPage() {
  const meta = getMockMeta("/faq");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/faq"
        title="Savol-javob"
        description="Butun bilimlar bazasi bo'yicha ko'p beriladigan savollar."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={faqItems} />

      <div className="rounded-xl border border-dashed border-border bg-surface p-5">
        <h2 className="mb-2 text-[15px] font-semibold text-primary-dark">Javobingizni topa olmadingizmi?</h2>
        <form className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Savolingizni yozing… (namuna forma, hali ulanmagan)"
            className="flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
            disabled
          />
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface shadow-softer hover:bg-primary-dark"
          >
            Yuborish
          </button>
        </form>
      </div>
    </div>
  );
}
