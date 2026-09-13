"use client";

import { useMemo, useState } from "react";
import { Calculator, Copy, Check, Package as PackageIcon } from "lucide-react";
import type { Product } from "@/lib/content/products";
import type { Package, PackageGroup } from "@/lib/content/types";
import { useTrack } from "@/hooks/useTrack";

function formatSom(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} so'm`;
}

// Pulls the numeric discount/avans % that's already written into the
// package's own text fields (e.g. "~15% gacha", "40% avans + 60% nasiya
// (25 kun)") instead of a separate hardcoded number — so this can only ever
// reflect what lib/content/packages.ts actually says.
function parsePercent(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

function parseAdvancePercent(paymentTerms: string): number | null {
  const m = paymentTerms.match(/(\d+(?:[.,]\d+)?)\s*%\s*avans/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

export function BatchCalculator({ products, packageGroups }: { products: Product[]; packageGroups: PackageGroup[] }) {
  const track = useTrack();
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [packageId, setPackageId] = useState("");
  const [copied, setCopied] = useState(false);

  // Real product names, for the free-text-with-suggestions field below —
  // this is display-only (what shows on the "mijozga yuborish" summary), it
  // never feeds the arithmetic. Deduped since a few names repeat across
  // variants (e.g. "Переходник" for both the ppr and kanalizatsiya lines).
  const productNames = useMemo(() => Array.from(new Set(products.map((p) => p.name_ru))), [products]);
  const allPackages: Package[] = useMemo(() => packageGroups.flatMap((g) => g.packages), [packageGroups]);

  const selectedPackage = allPackages.find((p) => p.id === packageId) ?? null;

  const quantityNum = Number(quantity);
  const unitPriceNum = Number(unitPrice);
  const hasValidInput = quantity.trim() !== "" && unitPrice.trim() !== "" && quantityNum > 0 && unitPriceNum > 0;

  const calc = useMemo(() => {
    if (!hasValidInput) return null;
    const subtotal = quantityNum * unitPriceNum;
    const discountPercent = selectedPackage ? parsePercent(selectedPackage.estimatedDiscount) : null;
    const discountAmount = discountPercent ? subtotal * (discountPercent / 100) : 0;
    const total = subtotal - discountAmount;
    const advancePercent = selectedPackage ? parseAdvancePercent(selectedPackage.paymentTerms) : null;
    const advanceAmount = advancePercent !== null ? total * (advancePercent / 100) : null;
    return { subtotal, discountPercent, discountAmount, total, advancePercent, advanceAmount };
  }, [hasValidInput, quantityNum, unitPriceNum, selectedPackage]);

  async function handleCopy() {
    if (!calc) return;
    const lines = [
      `Mahsulot: ${productName.trim() || "—"}`,
      `Miqdor: ${quantityNum} dona`,
      `Birlik narxi: ${formatSom(unitPriceNum)}`,
      `Oraliq summa: ${formatSom(calc.subtotal)}`,
      `Paket: ${selectedPackage?.name ?? "—"}`,
      `Chegirma: ${selectedPackage ? selectedPackage.estimatedDiscount : "—"}`,
      `Yakuniy summa: ${formatSom(calc.total)}`,
      calc.advanceAmount !== null
        ? `Avans (${calc.advancePercent}%): ${formatSom(calc.advanceAmount)}`
        : "Avans: —",
      `Yetkazish sharti: ${selectedPackage?.deliveryTime ?? "—"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      track("calculator_use", {
        meta: { packageId: selectedPackage?.id ?? null, quantity: quantityNum, total: Math.round(calc.total) },
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — nothing to fall back to silently
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[14px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light";
  const labelClass = "mb-1.5 block text-[13px] font-medium text-text-secondary";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary-light/50 bg-surface p-6 shadow-soft space-y-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-primary-dark">
          <Calculator size={17} className="text-accent" />
          Kirish ma&apos;lumotlari
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="calc-product" className={labelClass}>
              Mahsulot nomi (ixtiyoriy — faqat hisobotda ko&apos;rsatiladi)
            </label>
            <input
              id="calc-product"
              list="calc-product-names"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Masalan: Труба ППР"
              className={inputClass}
            />
            <datalist id="calc-product-names">
              {productNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="calc-quantity" className={labelClass}>
              Miqdor
            </label>
            <input
              id="calc-quantity"
              type="number"
              min="0"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="calc-price" className={labelClass}>
              Birlik narxi (so&apos;m)
            </label>
            <input
              id="calc-price"
              type="number"
              min="0"
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Qo'lda kiriting"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="calc-package" className={labelClass}>
              Hamkorlik paketi
            </label>
            <select
              id="calc-package"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className={inputClass}
            >
              <option value="">Paket tanlanmagan</option>
              {packageGroups.map((group) => (
                <optgroup key={group.id} label={group.title}>
                  {group.packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary-light/50 bg-surface p-6 shadow-soft space-y-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-primary-dark">
          <PackageIcon size={17} className="text-accent" />
          Natija
        </h2>

        {!calc ? (
          <p className="text-[13.5px] text-text-secondary">
            Hisoblash uchun miqdor va birlik narxini kiriting.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Oraliq summa</span>
                <span className="font-medium text-primary-dark">{formatSom(calc.subtotal)}</span>
              </div>
              {selectedPackage && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">
                    Chegirma ({selectedPackage.estimatedDiscount})
                  </span>
                  <span className="font-medium text-status-ok">
                    {calc.discountPercent !== null ? `- ${formatSom(calc.discountAmount)}` : "—"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold text-primary-dark">Yakuniy summa</span>
                <span className="text-[18px] font-bold text-primary-dark">{formatSom(calc.total)}</span>
              </div>
              {calc.advanceAmount !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Avans ({calc.advancePercent}%)</span>
                  <span className="font-medium text-primary-dark">{formatSom(calc.advanceAmount)}</span>
                </div>
              )}
              {selectedPackage && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Yetkazish sharti</span>
                  <span className="text-right font-medium text-primary-dark">{selectedPackage.deliveryTime}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-[13.5px] font-medium text-accent transition-colors hover:bg-accent/20"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Nusxalandi" : "Mijozga yuborish (nusxalash)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
