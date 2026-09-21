import { Package, Percent, FileText, CreditCard, Clock, Truck, MapPin, Shield, Gift } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Competitor } from "@/lib/content/types";

function Row({ icon, label, value, bold = false }: { icon: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-text-secondary mb-0.5">{label}</div>
        <div className={`text-[14px] text-primary-dark ${bold ? "font-bold" : "font-medium"}`}>{value}</div>
      </div>
    </div>
  );
}

export function CompetitorDetailPanel({ competitor }: { competitor: Competitor }) {
  const t = useTranslations("pages.salesProcess.battleCards.detail");
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm flex flex-col h-full overflow-y-auto">
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-primary-dark">{competitor.name}</h2>
          <span
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${
              competitor.threatLevel === "Yuqori"
                ? "border-primary/50 text-primary-dark bg-primary/5"
                : "border-border text-text-secondary bg-surface-alt"
            }`}
          >
            {t("threat", { level: competitor.threatLevel })}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <Row icon={<Package size={20} />} label={t("assortment")} value={competitor.assortment} />
        <Row icon={<Percent size={20} />} label={t("baseDiscount")} value={competitor.baseDiscount} />
        <Row icon={<Percent size={20} />} label={t("volumeDiscount")} value={competitor.volumeDiscount} />
        <Row icon={<Percent size={20} />} label={t("retroBonus")} value={competitor.retroBonus} />
        <Row icon={<Percent size={20} />} label={t("maxDiscount")} value={competitor.maxDiscount} bold />
        <Row icon={<FileText size={20} />} label={t("paymentTerms")} value={competitor.paymentTerms} />
        <Row icon={<CreditCard size={20} />} label={t("paymentMethod")} value={competitor.paymentMethod} />
        <Row icon={<Clock size={20} />} label={t("deliveryTime")} value={competitor.deliveryTime} />
        <Row icon={<Truck size={20} />} label={t("logistics")} value={competitor.logistics} />
        <Row icon={<MapPin size={20} />} label={t("dealerCoverage")} value={competitor.dealerCoverage} />
        <Row icon={<Shield size={20} />} label={t("certificates")} value={competitor.certificates} />
        <Row icon={<Gift size={20} />} label={t("marketingOffers")} value={competitor.marketingOffers} />
      </div>
    </div>
  );
}
