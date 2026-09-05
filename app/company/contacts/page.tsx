import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { contacts } from "@/lib/mock-data/contacts";

const columns: DbColumn[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "role", label: "Role", sortable: true },
  { key: "topic", label: "Topic" },
  { key: "phone", label: "Phone" },
  { key: "messenger", label: "Messenger" },
];

export default function ContactsPage() {
  const meta = getMockMeta("/company/contacts");
  const roles = Array.from(new Set(contacts.map((c) => c.role)));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/company/contacts"
        title="Internal Contacts"
        description="Who to reach for what — internal escalation directory."
        meta={meta}
      />
      <DatabaseTemplate
        columns={columns}
        rows={contacts}
        filters={[{ key: "role", label: "Role", options: roles }]}
      />
    </div>
  );
}
