import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getContacts } from "@/lib/content/loader";
import type { Contact } from "@/lib/content/types";
import type { Locale } from "@/i18n/routing";

export default async function ContactsPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const [t, tEmpty, contacts] = await Promise.all([
    getTranslations("pages.company.contacts"),
    getTranslations("emptyState.contactsNone"),
    getContacts(locale),
  ]);

  const columns: DbColumn<Contact>[] = [
    { key: "name", label: t("columns.name"), sortable: true },
    { key: "role", label: t("columns.role"), sortable: true },
    { key: "topic", label: t("columns.topic") },
    { key: "phone", label: t("columns.phone"), type: "phone" },
    { key: "messenger", label: t("columns.messenger"), type: "messenger" },
  ];

  const roles = Array.from(new Set(contacts.map((c) => c.role)));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path="/company/contacts" title={t("title")} description={t("description")} />
      <DatabaseTemplate
        columns={columns}
        rows={contacts}
        filters={[{ key: "role", label: t("columns.role"), options: roles }]}
        copyEntityType="contact"
        emptyState={{
          stateKey: "contactsNone",
          title: tEmpty("title"),
          reason: tEmpty("reason"),
          cta: { kind: "link", label: tEmpty("cta"), href: "/" },
        }}
      />
    </div>
  );
}
