import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getFaqs } from "@/lib/content/loader";
import type { Faq } from "@/lib/content/types";
import { contacts } from "@/lib/mock-data/contacts";
import { MessageCircle } from "lucide-react";

const columns: DbColumn<Faq>[] = [
  { key: "category", label: "Bo'lim", sortable: true },
  { key: "question", label: "Savol", sortable: true },
  { key: "answer", label: "Javob" },
];

export default async function FaqPage() {
  const faqs = await getFaqs();
  const categories = Array.from(new Set(faqs.map((f) => f.category)));

  // Closest-matching contact for knowledge-base questions (topic explicitly
  // mentions "bilimlar bazasi bo'yicha so'rovlar") — read live from the
  // Kontaktlar page's own data rather than a hardcoded value.
  const supportContact = contacts.find((c) => c.role === "Savdoni qo'llab-quvvatlash") ?? contacts[0];
  const telegramHandle = supportContact.messenger.replace(/^@/, "");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/faq"
        title="Savol-javob"
        description="Butun bilimlar bazasi bo'yicha ko'p beriladigan savollar."
      />
      <DatabaseTemplate
        columns={columns}
        rows={faqs}
        filters={[{ key: "category", label: "Bo'lim", options: categories }]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-primary-dark">Javobingizni topa olmadingizmi?</h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">Bizga yozing — {supportContact.role} javob beradi.</p>
        </div>
        <a
          href={`https://t.me/${telegramHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface shadow-softer hover:bg-primary-dark"
        >
          <MessageCircle size={15} />
          Bizga yozing
        </a>
      </div>
    </div>
  );
}
