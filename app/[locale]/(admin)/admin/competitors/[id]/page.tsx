import { unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getCompetitorRow } from "@/lib/admin/queries";
import { competitorFormSchema, type CompetitorFormInput } from "@/lib/admin/schemas";
import { upsertCompetitor } from "@/lib/admin/actions/competitors";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — Raqobatchi tahrirlash" };

function buildFields(isNew: boolean): EntityFieldDef<CompetitorFormInput>[] {
  return [
    { kind: "text", name: "id", label: "ID (slug)", placeholder: "masalan: comp-royal", readOnly: !isNew },
    { kind: "text", name: "name", label: "Nomi" },
    { kind: "text", name: "assortment", label: "Assortiment" },
    { kind: "text", name: "baseDiscount", label: "Bazaviy chegirma" },
    { kind: "text", name: "volumeDiscount", label: "Hajm chegirmasi" },
    { kind: "text", name: "retroBonus", label: "Retro bonus" },
    { kind: "text", name: "maxDiscount", label: "Maksimal chegirma" },
    { kind: "text", name: "paymentTerms", label: "To'lov shartlari" },
    { kind: "text", name: "paymentMethod", label: "To'lov usuli" },
    { kind: "text", name: "deliveryTime", label: "Yetkazib berish muddati" },
    { kind: "text", name: "logistics", label: "Logistika" },
    { kind: "text", name: "dealerCoverage", label: "Diler qamrovi" },
    { kind: "text", name: "certificates", label: "Sertifikatlar" },
    { kind: "text", name: "marketingOffers", label: "Marketing takliflari" },
    {
      kind: "select",
      name: "threatLevel",
      label: "Tahdid darajasi",
      options: [
        { value: "Yuqori", label: "Yuqori" },
        { value: "O'rta", label: "O'rta" },
        { value: "Ma'lumot yo'q", label: "Ma'lumot yo'q" },
      ],
    },
    {
      kind: "select",
      name: "status",
      label: "Holat",
      options: [
        { value: "draft", label: "Qoralama" },
        { value: "published", label: "Nashr etilgan" },
      ],
    },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminCompetitorEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const isNew = params.id === "new";
  const row = isNew ? null : await getCompetitorRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: CompetitorFormInput = row
    ? {
        id: row.id,
        name: row.name,
        assortment: row.assortment ?? "",
        baseDiscount: row.base_discount ?? "",
        volumeDiscount: row.volume_discount ?? "",
        retroBonus: row.retro_bonus ?? "",
        maxDiscount: row.max_discount ?? "",
        paymentTerms: row.payment_terms ?? "",
        paymentMethod: row.payment_method ?? "",
        deliveryTime: row.delivery_time ?? "",
        logistics: row.logistics ?? "",
        dealerCoverage: row.dealer_coverage ?? "",
        certificates: row.certificates ?? "",
        marketingOffers: row.marketing_offers ?? "",
        threatLevel: row.threat_level,
        status: row.status,
        version: String(row.version),
      }
    : {
        id: "",
        name: "",
        assortment: "",
        baseDiscount: "",
        volumeDiscount: "",
        retroBonus: "",
        maxDiscount: "",
        paymentTerms: "",
        paymentMethod: "",
        deliveryTime: "",
        logistics: "",
        dealerCoverage: "",
        certificates: "",
        marketingOffers: "",
        threatLevel: "Ma'lumot yo'q",
        status: "draft",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">
          {isNew ? "Yangi raqobatchi" : "Raqobatchini tahrirlash"}
        </h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_competitors/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <EntityForm
        schema={competitorFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew)}
        onSubmit={upsertCompetitor}
        backHref="/admin/competitors"
      />
    </div>
  );
}
