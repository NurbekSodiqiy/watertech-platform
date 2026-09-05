import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { faqItems } from "@/lib/mock-data/faq";

const columns: DbColumn[] = [
  { key: "question", label: "Question", sortable: true },
  { key: "answer", label: "Answer" },
  { key: "sourcePage", label: "Source Page", type: "link" },
  { key: "timesAsked", label: "Times Asked", sortable: true },
  { key: "lastUpdated", label: "Last Updated" },
];

export default function FaqPage() {
  const meta = getMockMeta("/faq");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/faq"
        title="FAQ"
        description="Frequently asked questions from across the whole knowledge base."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={faqItems} />

      <div className="rounded-xl border border-dashed border-border bg-surface p-5">
        <h2 className="mb-2 text-[15px] font-semibold text-primary-dark">Couldn't find your answer?</h2>
        <form className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Type your question… (form stub, not yet connected)"
            className="flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
            disabled
          />
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface shadow-softer hover:bg-primary-dark"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
