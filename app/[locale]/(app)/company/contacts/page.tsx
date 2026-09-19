import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { contacts, type Contact } from "@/lib/mock-data/contacts";

export default async function ContactsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.company.contacts");

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
      />
    </div>
  );
}
