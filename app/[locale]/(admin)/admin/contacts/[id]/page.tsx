import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getContactRow } from "@/lib/admin/queries";
import type { ContactFormInput } from "@/lib/admin/schemas";
import type { EntityFieldDef } from "@/components/admin/EntityForm";
import { ContactEditorForm } from "@/components/admin/ContactEditorForm";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.contacts" });
  return { title: t("editTitle") };
}

export default async function AdminContactEditPage({ params }: { params: { locale: Locale; id: string } }) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.contacts");

  const isNew = params.id === "new";
  const row = isNew ? null : await getContactRow(params.id);
  if (!isNew && !row) notFound();

  const fields: EntityFieldDef<ContactFormInput>[] = [
    { kind: "text", name: "id", label: t("fields.id"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    { kind: "text", name: "name", label: t("fields.name") },
    { kind: "text", name: "role", label: t("fields.role") },
    { kind: "text", name: "topic", label: t("fields.topic") },
    { kind: "text", name: "phone", label: t("fields.phone"), placeholder: t("fields.phonePlaceholder") },
    { kind: "text", name: "messenger", label: t("fields.messenger"), placeholder: t("fields.messengerPlaceholder") },
    {
      kind: "select",
      name: "status",
      label: t("fields.status"),
      options: [
        { value: "draft", label: t("fields.statusDraft") },
        { value: "published", label: t("fields.statusPublished") },
      ],
    },
    { kind: "text", name: "roleRu", label: t("fields.role"), group: "ru" },
    { kind: "text", name: "topicRu", label: t("fields.topic"), group: "ru" },
    { kind: "hidden", name: "version" },
  ];

  const defaultValues: ContactFormInput = row
    ? {
        id: row.id,
        name: row.name,
        role: row.role,
        topic: row.topic,
        phone: row.phone,
        messenger: row.messenger,
        status: row.status,
        roleRu: row.role_ru ?? "",
        topicRu: row.topic_ru ?? "",
        version: String(row.version),
      }
    : {
        id: "",
        name: "",
        role: "",
        topic: "",
        phone: "",
        messenger: "",
        status: "draft",
        roleRu: "",
        topicRu: "",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_contacts/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {t("versions")}
          </Link>
        )}
      </div>
      <ContactEditorForm defaultValues={defaultValues} fields={fields} />
    </div>
  );
}
