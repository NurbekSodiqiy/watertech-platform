import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getPackageRow, listPackageGroupRows } from "@/lib/admin/queries";
import type { PackageFormInput } from "@/lib/admin/schemas";
import type { AdminTranslate, EntityFieldDef } from "@/components/admin/EntityForm";
import { PackageEditorForm } from "@/components/admin/PackageEditorForm";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.packages" });
  return { title: t("editTitle") };
}

function buildFields(
  isNew: boolean,
  groupOptions: { value: string; label: string }[],
  t: AdminTranslate, tShared: AdminTranslate
): EntityFieldDef<PackageFormInput>[] {
  return [
    { kind: "text", name: "id", label: tShared("idLabel"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    { kind: "select", name: "groupId", label: t("fields.group"), options: groupOptions },
    { kind: "text", name: "name", label: tShared("nameLabel") },
    { kind: "checkbox", name: "isFeatured", label: t("fields.isFeatured") },
    { kind: "text", name: "orderVolume", label: t("fields.orderVolume") },
    { kind: "text", name: "paymentTerms", label: t("fields.paymentTerms") },
    { kind: "text", name: "estimatedDiscount", label: t("fields.estimatedDiscount"), placeholder: t("fields.estimatedDiscountPlaceholder") },
    { kind: "number", name: "discountPct", label: t("fields.discountPct"), step: "0.01" },
    { kind: "number", name: "advancePct", label: t("fields.advancePct"), step: "0.01" },
    { kind: "text", name: "logistics", label: t("fields.logistics") },
    { kind: "text", name: "deliveryTime", label: t("fields.deliveryTime") },
    {
      kind: "select",
      name: "status",
      label: tShared("statusLabel"),
      options: [
        { value: "draft", label: tShared("statusDraft") },
        { value: "published", label: tShared("statusPublished") },
      ],
    },
    { kind: "text", name: "nameRu", label: tShared("nameLabel"), group: "ru" },
    { kind: "text", name: "orderVolumeRu", label: t("fields.orderVolume"), group: "ru" },
    { kind: "text", name: "paymentTermsRu", label: t("fields.paymentTerms"), group: "ru" },
    { kind: "text", name: "estimatedDiscountRu", label: t("fields.estimatedDiscount"), group: "ru" },
    { kind: "text", name: "logisticsRu", label: t("fields.logistics"), group: "ru" },
    { kind: "text", name: "deliveryTimeRu", label: t("fields.deliveryTime"), group: "ru" },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminPackageEditPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { from?: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const [t, tShared] = await Promise.all([
    getTranslations("pages.admin.packages"),
    getTranslations("pages.admin.shared"),
  ]);

  const isNew = params.id === "new";
  const [row, groups] = await Promise.all([
    isNew ? Promise.resolve(null) : getPackageRow(params.id),
    listPackageGroupRows(),
  ]);
  if (!isNew && !row) notFound();
  // /admin/packages/new?from=<id> — the DataTable duplicate action; prefills
  // from that row's own full data, never the list projection.
  const source = isNew && searchParams.from ? await getPackageRow(searchParams.from) : null;

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.title }));

  const defaultValues: PackageFormInput = row
    ? {
        id: row.id,
        groupId: row.group_id,
        name: row.name,
        isFeatured: row.is_featured,
        orderVolume: row.order_volume,
        paymentTerms: row.payment_terms,
        estimatedDiscount: row.estimated_discount,
        discountPct: String(row.discount_pct),
        advancePct: row.advance_pct === null ? "" : String(row.advance_pct),
        logistics: row.logistics,
        deliveryTime: row.delivery_time,
        status: row.status,
        nameRu: row.name_ru ?? "",
        orderVolumeRu: row.order_volume_ru ?? "",
        paymentTermsRu: row.payment_terms_ru ?? "",
        estimatedDiscountRu: row.estimated_discount_ru ?? "",
        logisticsRu: row.logistics_ru ?? "",
        deliveryTimeRu: row.delivery_time_ru ?? "",
        version: String(row.version),
      }
    : source
      ? {
          id: `${source.id}-nusxa`,
          groupId: source.group_id,
          name: source.name,
          isFeatured: source.is_featured,
          orderVolume: source.order_volume,
          paymentTerms: source.payment_terms,
          estimatedDiscount: source.estimated_discount,
          discountPct: String(source.discount_pct),
          advancePct: source.advance_pct === null ? "" : String(source.advance_pct),
          logistics: source.logistics,
          deliveryTime: source.delivery_time,
          status: "draft",
          nameRu: source.name_ru ?? "",
          orderVolumeRu: source.order_volume_ru ?? "",
          paymentTermsRu: source.payment_terms_ru ?? "",
          estimatedDiscountRu: source.estimated_discount_ru ?? "",
          logisticsRu: source.logistics_ru ?? "",
          deliveryTimeRu: source.delivery_time_ru ?? "",
        }
      : {
          id: "",
          groupId: groups[0]?.id ?? "",
          name: "",
          isFeatured: false,
          orderVolume: "",
          paymentTerms: "",
          estimatedDiscount: "",
          discountPct: "0",
          advancePct: "",
          logistics: "",
          deliveryTime: "",
          status: "draft",
          nameRu: "",
          orderVolumeRu: "",
          paymentTermsRu: "",
          estimatedDiscountRu: "",
          logisticsRu: "",
          deliveryTimeRu: "",
        };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_packages/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {tShared("versions")}
          </Link>
        )}
      </div>
      <PackageEditorForm defaultValues={defaultValues} fields={buildFields(isNew, groupOptions, t, tShared)} />
    </div>
  );
}
