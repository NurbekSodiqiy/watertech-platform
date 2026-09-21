import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { ContentFade } from "@/components/motion/ContentFade";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getContacts, getFaqs } from "@/lib/content/loader";
import type { Faq } from "@/lib/content/types";
import { MessageCircle } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/** Seed id of the "Savdoni qo'llab-quvvatlash" contact (lib/content/contacts.ts). */
const SUPPORT_CONTACT_ID = "sales-support";

export default async function FaqPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const [t, tNav, tPage] = await Promise.all([
    getTranslations("emptyState.faqNone"),
    getTranslations("nav"),
    getTranslations("pages.faq"),
  ]);

  const columns: DbColumn<Faq>[] = [
    { key: "category", label: tPage("columns.category"), sortable: true },
    { key: "question", label: tPage("columns.question"), sortable: true },
    { key: "answer", label: tPage("columns.answer") },
  ];

  const [faqs, contacts] = await Promise.all([getFaqs(locale), getContacts(locale)]);
  const categories = Array.from(new Set(faqs.map((f) => f.category)));

  // Closest-matching contact for knowledge-base questions — read live from the
  // Kontaktlar page's own data rather than a hardcoded value. Matched by id,
  // not by role text: the role is localised and a manager may rename it. With
  // no published contact at all (none added yet) the block below is left out
  // instead of pointing at nobody.
  const supportContact = contacts.find((c) => c.id === SUPPORT_CONTACT_ID) ?? contacts[0];
  const telegramHandle = supportContact?.messenger.replace(/^@/, "");

  return (
    <ContentFade className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/faq"
        title={tNav("faq.title")}
        description={tPage("description")}
      />
      <DatabaseTemplate
        columns={columns}
        rows={faqs}
        filters={[{ key: "category", label: tPage("filterCategory"), options: categories }]}
        emptyState={{
          stateKey: "faqNone",
          title: t("title"),
          reason: t("reason"),
          cta: { kind: "open-search", label: t("cta") },
        }}
      />

      {supportContact && telegramHandle && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-primary-dark">{tPage("supportHeading")}</h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">{tPage("supportBody", { role: supportContact.role })}</p>
          </div>
          <a
            href={`https://t.me/${telegramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface shadow-softer hover:bg-primary-dark"
          >
            <MessageCircle size={15} />
            {tPage("supportCta")}
          </a>
        </div>
      )}
    </ContentFade>
  );
}
