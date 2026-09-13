"use client";

import { useEffect, useState, type RefObject } from "react";
import { Package, CreditCard, Percent, Truck, Clock, Star, ChevronRight } from "lucide-react";
import { packageGroups } from "@/lib/content/packages";
import type { Package as PackageItem } from "@/lib/content/types";
import { useTrack } from "@/hooks/useTrack";
import { CopyButton } from "@/components/CopyButton";

// One line per real field already shown in the card below — no new content,
// just the same values joined for the clipboard.
function packageSummaryText(pkg: PackageItem): string {
  return [
    pkg.name,
    `Buyurtma hajmi: ${pkg.orderVolume}`,
    `To'lov turi va sharti: ${pkg.paymentTerms}`,
    `Taxminiy chegirma: ${pkg.estimatedDiscount}`,
    `Logistika: ${pkg.logistics}`,
    `Yetkazish muddati: ${pkg.deliveryTime}`,
  ].join("\n");
}

/** Hamkorlik paketlari tab — left+right panel pair. Owns its own selection
 * state; remounts (and so resets) whenever the operator switches away and
 * back, same as the inline ternary it replaced. */
export function PackagesTab({ leftPanelRef }: { leftPanelRef: RefObject<HTMLDivElement> }) {
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const track = useTrack();

  useEffect(() => {
    if (selectedPackage) track("package_view", { entityType: "package", entityId: selectedPackage.id });
  }, [selectedPackage, track]);

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [selectedPackage, leftPanelRef]);

  return (
    <>
      <div
        ref={leftPanelRef}
        className="col-span-12 md:col-span-8 bg-surface border border-primary-light/50 rounded-2xl p-8 min-h-[400px] flex flex-col shadow-soft sticky top-[88px] max-h-[calc(100vh-88px-24px)] overflow-y-auto"
      >
        {!selectedPackage ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-text-secondary text-lg">
              O&apos;ng paneldan kerakli paketni tanlang...
            </p>
          </div>
        ) : (
          <div className={`rounded-xl border ${selectedPackage.isFeatured ? "border-primary" : "border-border"} bg-surface p-6 shadow-sm flex flex-col`}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-primary-dark flex items-center gap-2">
                {selectedPackage.name}
                {selectedPackage.isFeatured && (
                  <Star size={20} className="text-accent" fill="currentColor" aria-label="Tavsiya etiladi" />
                )}
              </h2>
              <CopyButton value={packageSummaryText(selectedPackage)} label="Nusxalash" />
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                  <Package size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-secondary mb-0.5">Buyurtma hajmi</div>
                  <div className="text-[15px] font-bold text-primary-dark">{selectedPackage.orderVolume}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-secondary mb-0.5">To&apos;lov turi &amp; sharti</div>
                  <div className="text-[15px] font-bold text-primary-dark">{selectedPackage.paymentTerms}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                  <Percent size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-secondary mb-0.5">Taxminiy chegirma</div>
                  <div className="text-[15px] font-bold text-primary-dark">{selectedPackage.estimatedDiscount}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-secondary mb-0.5">Logistika / Yetkazib berish</div>
                  <div className="text-[15px] font-bold text-primary-dark">{selectedPackage.logistics}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-secondary mb-0.5">Yetkazish muddati</div>
                  <div className="text-[15px] font-bold text-primary-dark">{selectedPackage.deliveryTime}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-12 md:col-span-4 bg-surface border border-primary-light/50 rounded-2xl p-4 space-y-2 shadow-soft sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
        {packageGroups.map((group) => (
          <div key={group.id} className="flex flex-col space-y-2">
            {group.packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors text-left font-medium ${
                  selectedPackage?.id === pkg.id
                    ? "bg-surface-alt border-primary text-primary-dark"
                    : pkg.isFeatured
                      ? "bg-surface border-primary/40 hover:border-primary hover:bg-surface-alt text-primary-dark"
                      : "bg-surface border-border hover:bg-surface-alt text-primary-dark"
                }`}
              >
                <span className="flex items-center gap-2">
                  {pkg.name}
                  {pkg.isFeatured && (
                    <Star size={16} className="text-accent shrink-0" fill="currentColor" aria-label="Tavsiya etiladi" />
                  )}
                </span>
                <ChevronRight className={`w-4 h-4 ${selectedPackage?.id === pkg.id ? "text-primary" : "text-text-secondary"}`} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
