import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getCompetitorRow } from "@/lib/admin/queries";
import type { CompetitorFormInput } from "@/lib/admin/schemas";
import type { AdminTranslate, EntityFieldDef } from "@/components/admin/EntityForm";
import { CompetitorEditorForm } from "@/components/admin/CompetitorEditorForm";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.competitors" });
  return { title: t("editTitle") };
}

function buildFields(isNew: boolean, t: AdminTranslate, tShared: AdminTranslate): EntityFieldDef<CompetitorFormInput>[] {
  return [
    { kind: "text", name: "id", label: tShared("idLabel"), placeholder: t("fields.idPlaceholder"), readOnly: !isNew },
    { kind: "text", name: "name", label: tShared("nameLabel") },
    { kind: "text", name: "assortment", label: t("fields.assortment") },
    { kind: "text", name: "baseDiscount", label: t("fields.baseDiscount") },
    { kind: "text", name: "volumeDiscount", label: t("fields.volumeDiscount") },
    { kind: "text", name: "retroBonus", label: t("fields.retroBonus") },
    { kind: "text", name: "maxDiscount", label: t("fields.maxDiscount") },
    { kind: "text", name: "paymentTerms", label: t("fields.paymentTerms") },
    { kind: "text", name: "paymentMethod", label: t("fields.paymentMethod") },
    { kind: "text", name: "deliveryTime", label: t("fields.deliveryTime") },
    { kind: "text", name: "logistics", label: t("fields.logistics") },
    { kind: "text", name: "dealerCoverage", label: t("fields.dealerCoverage") },
    { kind: "text", name: "certificates", label: t("fields.certificates") },
    { kind: "text", name: "marketingOffers", label: t("fields.marketingOffers") },
    {
      kind: "select",
      name: "threatLevel",
      label: t("fields.threatLevel"),
      options: [
        { value: "Yuqori", label: t("fields.threatHigh") },
        { value: "O'rta", label: t("fields.threatMedium") },
        { value: "Ma'lumot yo'q", label: t("fields.threatUnknown") },
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

export default async function AdminCompetitorEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const [t, tShared] = await Promise.all([
    getTranslations("pages.admin.competitors"),
    getTranslations("pages.admin.shared"),
  ]);

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
          {isNew ? t("newTitle") : t("editTitle")}
        </h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_competitors/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {tShared("versions")}
          </Link>
        )}
      </div>
      <CompetitorEditorForm defaultValues={defaultValues} fields={buildFields(isNew, t, tShared)} />
    </div>
  );
}
