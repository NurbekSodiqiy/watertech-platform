const fs = require('fs');

const content = "use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Package, CreditCard, Percent, Truck, Clock } from "lucide-react";
import { partnershipPackagesData, PartnershipPackage } from "@/lib/mock-data/partnership-packages";

export default function ScriptsPage() {
  const [activeTab, setActiveTab] = useState<"objections" | "packages">("objections");
  
  // E'tirozlar state
  const [activeScreenContext, setActiveScreenContext] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Paketlar state
  const [selectedPackage, setSelectedPackage] = useState<PartnershipPackage | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const selectScript = (text: string) => {
    setActiveScreenContext(text);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Jonli skriptlar va Yordamchi</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          O'ng paneldan kerakli e'tiroz yoki skriptni tanlang va ekranda o'qing.
        </p>
      </div>

      <div className="flex w-fit shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-alt p-1">
        <button
          onClick={() => {
            setActiveTab("objections");
            setActiveScreenContext(null);
            setSelectedPackage(null);
          }}
          className={\lex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors \\}
        >
          E'tirozlar
        </button>
        <button
          onClick={() => {
            setActiveTab("packages");
            setActiveScreenContext(null);
            setSelectedPackage(null);
          }}
          className={\lex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors \\}
        >
          Hamkorlik paketlari
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (The "TV Screen") */}
        <div className="col-span-12 md:col-span-8 bg-surface border border-border rounded-2xl p-8 min-h-[400px] flex flex-col justify-center shadow-sm">
          {activeTab === "objections" ? (
            !activeScreenContext ? (
              <p className="text-center text-text-secondary text-lg">
                O'ng paneldan kerakli e'tirozni yoki skriptni tanlang...
              </p>
            ) : (
              <div className="text-lg md:text-xl leading-relaxed text-primary-dark whitespace-pre-wrap">
                {activeScreenContext}
              </div>
            )
          ) : (
            !selectedPackage ? (
              <p className="text-center text-text-secondary text-lg">
                O'ng paneldan kerakli paketni tanlang...
              </p>
            ) : (
              <div className={\ounded-xl border \ bg-surface p-6 shadow-sm flex flex-col\}>
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-2xl font-bold text-primary-dark flex items-center gap-2">
                    {selectedPackage.name}
                    {selectedPackage.isFeatured && <span title="Tavsiya etiladi">⭐</span>}
                  </h2>
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
                      <div className="text-xs font-medium text-text-secondary mb-0.5">To'lov turi & sharti</div>
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
            )
          )}
        </div>

        {/* RIGHT PANEL (The "Remote Control") */}
        <div className="col-span-12 md:col-span-4 bg-surface border border-border rounded-2xl p-4 space-y-2 shadow-sm">
          {activeTab === "objections" ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggleCategory("qimmat")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-alt transition-colors font-medium text-primary-dark"
              >
                <span className="flex items-center gap-2">
                  💰 Qimmat
                </span>
                {expandedCategory === "qimmat" ? (
                  <ChevronDown className="w-5 h-5 text-text-secondary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-text-secondary" />
                )}
              </button>
              
              {expandedCategory === "qimmat" && (
                <div className="bg-surface-alt border-t border-border flex flex-col p-2 space-y-1">
                  <button
                    onClick={() => selectScript("TEST: Mijoz boshqa joyda arzonroq ekanligini aytdi. Bunga javob skripti shu yerda chiqadi.")}
                    className="text-left w-full p-3 rounded-lg hover:bg-surface text-text-secondary hover:text-primary-dark text-sm transition-colors pl-6"
                  >
                    Boshqa joyda arzonroq
                  </button>
                  <button
                    onClick={() => selectScript("TEST: Mijoz byudjeti yo'qligini aytdi. Bunga javob skripti shu yerda chiqadi.")}
                    className="text-left w-full p-3 rounded-lg hover:bg-surface text-text-secondary hover:text-primary-dark text-sm transition-colors pl-6"
                  >
                    Hozir byudjetimiz yo'q
                  </button>
                </div>
              )}
            </div>
          ) : (
            partnershipPackagesData.map((group) => (
              <div key={group.id} className="flex flex-col space-y-2">
                <div className="mb-2 px-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wide leading-relaxed">
                  {group.subtitle}
                </div>
                {group.packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={\w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors text-left font-medium \\}
                  >
                    <span className="flex items-center gap-2">
                      {pkg.name} {pkg.isFeatured && "⭐"}
                    </span>
                    <ChevronRight className={\w-4 h-4 \\} />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
;

fs.writeFileSync('D:\\Arxiv\\Desktop\\full\\app\\sales-process\\scripts\\page.tsx', content, 'utf8');
