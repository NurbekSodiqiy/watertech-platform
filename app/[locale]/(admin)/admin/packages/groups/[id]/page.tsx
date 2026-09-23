import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getPackageGroupRow } from "@/lib/admin/queries";
import type { PackageGroupFormInput } from "@/lib/admin/schemas";
import type { AdminTranslate, EntityFieldDef } from "@/components/admin/EntityForm";
import { PackageGroupEditorForm } from "@/components/admin/PackageGroupEditorForm";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.packageGroups" });
  return { title: t("editTitle") };
}

function buildFields(isNew: boolean, t: AdminTranslate, tShared: AdminTranslate): EntityFieldDef<PackageGroupFormInput>[] {
  return [
    { kind: "text", name: "id", label: tShared("idLabel"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    { kind: "text", name: "title", label: tShared("nameLabel") },
    { kind: "text", name: "subtitle", label: t("fields.subtitle") },
    {
      kind: "select",
      name: "status",
      label: tShared("statusLabel"),
      options: [
        { value: "draft", label: tShared("statusDraft") },
        { value: "published", label: tShared("statusPublished") },
      ],
    },
    { kind: "text", name: "titleRu", label: tShared("nameLabel"), group: "ru" },
    { kind: "text", name: "subtitleRu", label: t("fields.subtitle"), group: "ru" },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminPackageGroupEditPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { from?: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const [t, tShared] = await Promise.all([
    getTranslations("pages.admin.packageGroups"),
    getTranslations("pages.admin.shared"),
  ]);

  const isNew = params.id === "new";
  const row = isNew ? null : await getPackageGroupRow(params.id);
  if (!isNew && !row) notFound();
  // /admin/packages/groups/new?from=<id> — the DataTable duplicate action;
  // prefills from that row's own full data, never the list projection.
  const source = isNew && searchParams.from ? await getPackageGroupRow(searchParams.from) : null;

  const defaultValues: PackageGroupFormInput = row
    ? {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        status: row.status,
        titleRu: row.title_ru ?? "",
        subtitleRu: row.subtitle_ru ?? "",
        version: String(row.version),
      }
    : source
      ? {
          id: `${source.id}-nusxa`,
          title: source.title,
          subtitle: source.subtitle,
          status: "draft",
          titleRu: source.title_ru ?? "",
          subtitleRu: source.subtitle_ru ?? "",
        }
      : { id: "", title: "", subtitle: "", status: "draft", titleRu: "", subtitleRu: "" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_package_groups/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {tShared("versions")}
          </Link>
        )}
      </div>
      <PackageGroupEditorForm defaultValues={defaultValues} fields={buildFields(isNew, t, tShared)} />
    </div>
  );
}
