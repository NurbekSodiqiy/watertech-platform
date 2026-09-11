import { Package, Percent, FileText, CreditCard, Clock, Truck, MapPin, Shield, Gift } from "lucide-react";
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
            Raqobat: {competitor.threatLevel}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <Row icon={<Package size={20} />} label="Assortiment" value={competitor.assortment} />
        <Row icon={<Percent size={20} />} label="Baza chegirmasi" value={competitor.baseDiscount} />
        <Row icon={<Percent size={20} />} label="Obyom chegirmasi (1 fura)" value={competitor.volumeDiscount} />
        <Row icon={<Percent size={20} />} label="Retro-bonus (yillik)" value={competitor.retroBonus} />
        <Row icon={<Percent size={20} />} label="Jami maks. chegirma" value={competitor.maxDiscount} bold />
        <Row icon={<FileText size={20} />} label="Nasiya & muddatli to'lov shartlari" value={competitor.paymentTerms} />
        <Row icon={<CreditCard size={20} />} label="To'lov shakli" value={competitor.paymentMethod} />
        <Row icon={<Clock size={20} />} label="Yetkazish muddati" value={competitor.deliveryTime} />
        <Row icon={<Truck size={20} />} label="Logistika & MOQ shartlari" value={competitor.logistics} />
        <Row icon={<MapPin size={20} />} label="Dilerlik qamrovi" value={competitor.dealerCoverage} />
        <Row icon={<Shield size={20} />} label="Sertifikatlar & garantiya" value={competitor.certificates} />
        <Row icon={<Gift size={20} />} label="Marketing & ustalarga takliflar" value={competitor.marketingOffers} />
      </div>
    </div>
  );
}
