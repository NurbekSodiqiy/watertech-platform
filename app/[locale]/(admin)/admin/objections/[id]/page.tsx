import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getObjectionRow } from "@/lib/admin/queries";
import type { ObjectionFormInput } from "@/lib/admin/schemas";
import type { AdminTranslate, EntityFieldDef } from "@/components/admin/EntityForm";
import { ObjectionEditorForm } from "@/components/admin/ObjectionEditorForm";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.objections" });
  return { title: t("editTitle") };
}

function buildFields(isNew: boolean, t: AdminTranslate, tShared: AdminTranslate): EntityFieldDef<ObjectionFormInput>[] {
  return [
    { kind: "text", name: "id", label: tShared("idLabel"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    { kind: "text", name: "label", label: tShared("nameLabel") },
    { kind: "csv", name: "keywords", label: t("fields.keywords"), hint: t("fields.keywordsHint") },
    { kind: "textarea", name: "clientSays", label: t("fields.clientSays"), rows: 2 },
    { kind: "textarea", name: "realMeaning", label: t("fields.realMeaning"), rows: 2 },
    { kind: "textarea", name: "response", label: t("fields.response"), rows: 4 },
    { kind: "textarea", name: "followUp", label: t("fields.followUp"), rows: 2 },
    { kind: "csv", name: "scriptIds", label: t("fields.scriptIds"), hint: t("fields.scriptIdsHint") },
    {
      kind: "select",
      name: "status",
      label: tShared("statusLabel"),
      options: [
        { value: "draft", label: tShared("statusDraft") },
        { value: "published", label: tShared("statusPublished") },
      ],
    },
    { kind: "text", name: "labelRu", label: tShared("nameLabel"), group: "ru" },
    { kind: "textarea", name: "clientSaysRu", label: t("fields.clientSays"), rows: 2, group: "ru" },
    { kind: "textarea", name: "realMeaningRu", label: t("fields.realMeaning"), rows: 2, group: "ru" },
    { kind: "textarea", name: "responseRu", label: t("fields.response"), rows: 4, group: "ru" },
    { kind: "textarea", name: "followUpRu", label: t("fields.followUp"), rows: 2, group: "ru" },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminObjectionEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const [t, tShared] = await Promise.all([
    getTranslations("pages.admin.objections"),
    getTranslations("pages.admin.shared"),
  ]);

  const isNew = params.id === "new";
  const row = isNew ? null : await getObjectionRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: ObjectionFormInput = row
    ? {
        id: row.id,
        label: row.label,
        keywords: row.keywords.join(", "),
        clientSays: row.client_says,
        realMeaning: row.real_meaning,
        response: row.response,
        followUp: row.follow_up ?? "",
        scriptIds: row.script_ids.join(", "),
        status: row.status,
        labelRu: row.label_ru ?? "",
        clientSaysRu: row.client_says_ru ?? "",
        realMeaningRu: row.real_meaning_ru ?? "",
        responseRu: row.response_ru ?? "",
        followUpRu: row.follow_up_ru ?? "",
        version: String(row.version),
      }
    : {
        id: "",
        label: "",
        keywords: "",
        clientSays: "",
        realMeaning: "",
        response: "",
        followUp: "",
        scriptIds: "",
        status: "draft",
        labelRu: "",
        clientSaysRu: "",
        realMeaningRu: "",
        responseRu: "",
        followUpRu: "",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_objections/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {tShared("versions")}
          </Link>
        )}
      </div>
      <ObjectionEditorForm defaultValues={defaultValues} fields={buildFields(isNew, t, tShared)} />
    </div>
  );
}
