import { unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { contacts, type Contact } from "@/lib/mock-data/contacts";

const columns: DbColumn<Contact>[] = [
  { key: "name", label: "Ism", sortable: true },
  { key: "role", label: "Lavozim", sortable: true },
  { key: "topic", label: "Mavzu" },
  { key: "phone", label: "Telefon" },
  { key: "messenger", label: "Messenjer" },
];

export default function ContactsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  const roles = Array.from(new Set(contacts.map((c) => c.role)));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/company/contacts"
        title="Ichki kontaktlar"
        description="Qaysi masala bo'yicha kimga murojaat qilish — ichki eskalatsiya yo'nalgichi."
      />
      <DatabaseTemplate
        columns={columns}
        rows={contacts}
        filters={[{ key: "role", label: "Lavozim", options: roles }]}
      />
    </div>
  );
}
