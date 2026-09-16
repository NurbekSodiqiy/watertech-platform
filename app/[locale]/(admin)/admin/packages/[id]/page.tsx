import { unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getPackageRow, listPackageGroupRows } from "@/lib/admin/queries";
import { packageFormSchema, type PackageFormInput } from "@/lib/admin/schemas";
import { upsertPackage } from "@/lib/admin/actions/packages";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — Paket tahrirlash" };

function buildFields(
  isNew: boolean,
  groupOptions: { value: string; label: string }[]
): EntityFieldDef<PackageFormInput>[] {
  return [
    { kind: "text", name: "id", label: "ID (slug)", placeholder: "masalan: paket-standart", readOnly: !isNew },
    { kind: "select", name: "groupId", label: "Guruh", options: groupOptions },
    { kind: "text", name: "name", label: "Nomi" },
    { kind: "checkbox", name: "isFeatured", label: "Tavsiya etilgan" },
    { kind: "text", name: "orderVolume", label: "Buyurtma hajmi" },
    { kind: "text", name: "paymentTerms", label: "To'lov shartlari" },
    { kind: "text", name: "estimatedDiscount", label: "Taxminiy chegirma (matn)", placeholder: "masalan: ~15% gacha" },
    { kind: "number", name: "discountPct", label: "Chegirma (%, raqam)", step: "0.01" },
    { kind: "number", name: "advancePct", label: "Avans (%, ixtiyoriy)", step: "0.01" },
    { kind: "text", name: "logistics", label: "Logistika" },
    { kind: "text", name: "deliveryTime", label: "Yetkazib berish muddati" },
    {
      kind: "select",
      name: "status",
      label: "Holat",
      options: [
        { value: "draft", label: "Qoralama" },
        { value: "published", label: "Nashr etilgan" },
      ],
    },
    { kind: "text", name: "nameRu", label: "Nomi", group: "ru" },
    { kind: "text", name: "orderVolumeRu", label: "Buyurtma hajmi", group: "ru" },
    { kind: "text", name: "paymentTermsRu", label: "To'lov shartlari", group: "ru" },
    { kind: "text", name: "estimatedDiscountRu", label: "Taxminiy chegirma (matn)", group: "ru" },
    { kind: "text", name: "logisticsRu", label: "Logistika", group: "ru" },
    { kind: "text", name: "deliveryTimeRu", label: "Yetkazib berish muddati", group: "ru" },
  ];
}

export default async function AdminPackageEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const isNew = params.id === "new";
  const [row, groups] = await Promise.all([
    isNew ? Promise.resolve(null) : getPackageRow(params.id),
    listPackageGroupRows(),
  ]);
  if (!isNew && !row) notFound();

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
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? "Yangi paket" : "Paketni tahrirlash"}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_packages/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <EntityForm
        schema={packageFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew, groupOptions)}
        onSubmit={upsertPackage}
        backHref="/admin/packages"
      />
    </div>
  );
}
