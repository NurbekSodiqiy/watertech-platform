import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getChangelogRow } from "@/lib/admin/queries";
import type { ChangelogFormInput } from "@/lib/admin/schemas";
import type { EntityFieldDef } from "@/components/admin/EntityForm";
import { ChangelogEditorForm } from "@/components/admin/ChangelogEditorForm";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.changelog" });
  return { title: t("editTitle") };
}

export default async function AdminChangelogEditPage({ params }: { params: { locale: Locale; id: string } }) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.changelog");

  const isNew = params.id === "new";
  const row = isNew ? null : await getChangelogRow(params.id);
  if (!isNew && !row) notFound();

  const fields: EntityFieldDef<ChangelogFormInput>[] = [
    { kind: "text", name: "id", label: t("fields.id"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    { kind: "text", name: "publishedOn", label: t("fields.publishedOn"), placeholder: t("fields.publishedOnPlaceholder") },
    { kind: "text", name: "title", label: t("fields.title") },
    { kind: "textarea", name: "body", label: t("fields.body"), rows: 6 },
    {
      kind: "text",
      name: "linkedPath",
      label: t("fields.linkedPath"),
      placeholder: t("fields.linkedPathPlaceholder"),
    },
    { kind: "text", name: "approvedBy", label: t("fields.approvedBy") },
    {
      kind: "select",
      name: "status",
      label: t("fields.status"),
      options: [
        { value: "draft", label: t("fields.statusDraft") },
        { value: "published", label: t("fields.statusPublished") },
      ],
    },
    { kind: "text", name: "titleRu", label: t("fields.title"), group: "ru" },
    { kind: "textarea", name: "bodyRu", label: t("fields.body"), rows: 6, group: "ru" },
    { kind: "hidden", name: "version" },
  ];

  const defaultValues: ChangelogFormInput = row
    ? {
        id: row.id,
        publishedOn: row.published_on,
        title: row.title,
        body: row.body,
        linkedPath: row.linked_path ?? "",
        approvedBy: row.approved_by,
        status: row.status,
        titleRu: row.title_ru ?? "",
        bodyRu: row.body_ru ?? "",
        version: String(row.version),
      }
    : {
        id: "",
        publishedOn: "",
        title: "",
        body: "",
        linkedPath: "",
        approvedBy: "",
        status: "draft",
        titleRu: "",
        bodyRu: "",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_changelog/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {t("versions")}
          </Link>
        )}
      </div>
      <ChangelogEditorForm defaultValues={defaultValues} fields={fields} />
    </div>
  );
}
