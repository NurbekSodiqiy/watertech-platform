import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getProductRow } from "@/lib/admin/queries";
import { productFormSchema, type ProductFormInput } from "@/lib/admin/schemas";
import { upsertProduct } from "@/lib/admin/actions/products";
import { EntityForm, type AdminTranslate, type EntityFieldDef } from "@/components/admin/EntityForm";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.products" });
  return { title: t("editTitle") };
}

function buildFields(isNew: boolean, t: AdminTranslate, tShared: AdminTranslate): EntityFieldDef<ProductFormInput>[] {
  return [
    { kind: "text", name: "id", label: tShared("idLabel"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    {
      kind: "text",
      name: "filename",
      label: t("fields.filename"),
      placeholder: t("fields.filenamePlaceholder"),
    },
    { kind: "text", name: "name_ru", label: t("fields.nameRu") },
    { kind: "text", name: "name_uz", label: t("fields.nameUz") },
    { kind: "csv", name: "sizes", label: t("fields.sizes"), hint: t("fields.sizesHint") },
    {
      kind: "select",
      name: "line",
      label: t("fields.line"),
      options: [
        { value: "ppr", label: t("lines.ppr") },
        { value: "kanalizatsiya", label: t("lines.kanalizatsiya") },
      ],
    },
    {
      kind: "select",
      name: "category",
      label: t("fields.category"),
      options: [
        { value: "truba", label: t("categories.truba") },
        { value: "fiting", label: t("categories.fiting") },
        { value: "kran", label: t("categories.kran") },
        { value: "aksessuar", label: t("categories.aksessuar") },
      ],
    },
    {
      kind: "select",
      name: "material",
      label: t("fields.material"),
      options: [
        { value: "", label: "—" },
        { value: "latun", label: t("materials.latun") },
      ],
    },
    {
      kind: "select",
      name: "status",
      label: tShared("statusLabel"),
      options: [
        { value: "draft", label: tShared("statusDraft") },
        { value: "published", label: tShared("statusPublished") },
      ],
    },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminProductEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const [t, tShared] = await Promise.all([
    getTranslations("pages.admin.products"),
    getTranslations("pages.admin.shared"),
  ]);

  const isNew = params.id === "new";
  const row = isNew ? null : await getProductRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: ProductFormInput = row
    ? {
        id: row.id,
        filename: row.filename,
        name_ru: row.name_ru,
        name_uz: row.name_uz ?? "",
        sizes: row.sizes.join(", "),
        line: row.line,
        category: row.category,
        material: row.material ?? "",
        status: row.status,
        version: String(row.version),
      }
    : {
        id: "",
        filename: "",
        name_ru: "",
        name_uz: "",
        sizes: "",
        line: "ppr",
        category: "truba",
        material: "",
        status: "draft",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_products/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {tShared("versions")}
          </Link>
        )}
      </div>
      <EntityForm
        schema={productFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew, t, tShared)}
        onSubmit={upsertProduct}
        backHref="/admin/products"
      />
    </div>
  );
}
