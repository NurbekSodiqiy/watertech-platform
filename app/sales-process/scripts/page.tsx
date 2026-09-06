"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Package, CreditCard, Percent, Truck, Clock } from "lucide-react";
import { partnershipPackagesData, PartnershipPackage } from "@/lib/mock-data/partnership-packages";

// FAQ Data
type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  id: string;
  name: string;
  icon: string;
  questions: FAQItem[];
};

const faqData: FAQCategory[] = [
  {
    id: "product",
    name: "Mahsulot haqida",
    icon: "📦",
    questions: [
      {
        question: "Polipropilen quvurlarning kafolat muddati qancha?",
        answer: "WaterTech mahsulotlari uchun 10 yil muddat kafolat beriladi, foydalanish muddati 50 yil"
      },
      {
        question: "Qaysi standartlarga javob beradi?",
        answer: "WaterTech mahsulotlari ISO va GOST sertifikatlariga ega."
      },
      {
        question: "Montaj qilish qiyin emasmi?",
        answer: "Mahsulotlar tarkibi sifatli xomashyolardan (asl polipropilen) tashkil topgan, shu sababli foydalanishda ya'ni montaj jarayonlarni mijozga qiyinchilik tug'dirmaydi"
      },
      {
        question: "Issiq suvga bardosh beradimi?",
        answer: "Issiq suv uchun mo'ljallangan quvurlarimiz 80 gradus issiqlik darajasi uchun mo'ljallangan"
      }
    ]
  },
  {
    id: "delivery",
    name: "Yetkazish",
    icon: "🚚",
    questions: [
      {
        question: "Toshkentga yetkazib berish qancha vaqt oladi?",
        answer: "24 soat ichida yetkazib beramiz"
      },
      {
        question: "Minimal buyurtma hajmi bormi?",
        answer: "Minimal buyurtma hajmi 15 mln"
      },
      {
        question: "Yetkazish narxi qanday hisoblanadi?",
        answer: "Yangi mijozlar uchun yetkazish xizmati kompaniya tomonidan qoplanadi"
      },
      {
        question: "Viloyatlarga yetkazib beramizmi?",
        answer: "12 ta viloyatga kelishuv asosida yetkazib beramiz."
      }
    ]
  },
  {
    id: "payment",
    name: "To'lov",
    icon: "💳",
    questions: [
      {
        question: "Qanday to'lov usullari mavjud?",
        answer: "Istalgan to'lov usuli mavjud (naqd, click, perechisleniya)"
      },
      {
        question: "Nasiyaga olish mumkinmi?",
        answer: "Yuridik shartnoma va oldindan 50% to'lov asosida xarid qilish mumkin"
      },
      {
        question: "Chegirmalar qachon beriladi?",
        answer: "Mahsulotlarimiz turidan kelib chiqib 15% gacha chegirmalarimiz mavjud"
      },
      {
        question: "Avans to'lash kerakmi?",
        answer: "Yangi mijozlar uchun 50% avans to'lab xarid qilish mumkin."
      }
    ]
  }
];

export default function ScriptsPage() {
  const [activeTab, setActiveTab] = useState<"faq" | "packages">("faq");
  
  // Savol-javob state
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
          O&apos;ng paneldan kerakli bo&apos;limni tanlang va ekranda javobni o&apos;qing.
        </p>
      </div>

      <div className="flex w-fit shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-alt p-1">
        <button
          onClick={() => {
            setActiveTab("faq");
            setActiveScreenContext(null);
            setSelectedPackage(null);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "faq" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          Savol-javob
        </button>
        <button
          onClick={() => {
            setActiveTab("packages");
            setActiveScreenContext(null);
            setSelectedPackage(null);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "packages" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          Hamkorlik paketlari
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (The "TV Screen") */}
        <div className="col-span-12 md:col-span-8 bg-surface border border-border rounded-2xl p-8 min-h-[400px] flex flex-col justify-center shadow-sm">
          {activeTab === "faq" ? (
            !activeScreenContext ? (
              <p className="text-center text-text-secondary text-lg">
                O&apos;ng paneldan kerakli savolni tanlang...
              </p>
            ) : (
              <div className="text-lg md:text-xl leading-relaxed text-primary-dark whitespace-pre-wrap">
                {activeScreenContext}
              </div>
            )
          ) : (
            !selectedPackage ? (
              <p className="text-center text-text-secondary text-lg">
                O&apos;ng paneldan kerakli paketni tanlang...
              </p>
            ) : (
              <div className={`rounded-xl border ${selectedPackage.isFeatured ? 'border-primary' : 'border-border'} bg-surface p-6 shadow-sm flex flex-col`}>
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
            )
          )}
        </div>

        {/* RIGHT PANEL (The "Remote Control") */}
        <div className="col-span-12 md:col-span-4 bg-surface border border-border rounded-2xl p-4 space-y-2 shadow-sm">
          {activeTab === "faq" ? (
            <div className="rounded-xl border border-border overflow-hidden">
              {faqData.map((category, index) => (
                <div key={category.id} className={index !== 0 ? "border-t border-border" : ""}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-alt transition-colors font-medium text-primary-dark"
                  >
                    <span className="flex items-center gap-2">
                      {category.icon} {category.name}
                    </span>
                    {expandedCategory === category.id ? (
                      <ChevronDown className="w-5 h-5 text-text-secondary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-text-secondary" />
                    )}
                  </button>
                  
                  {expandedCategory === category.id && (
                    <div className="bg-surface-alt border-t border-border flex flex-col p-2 space-y-1">
                      {category.questions.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectScript(item.answer)}
                          className="text-left w-full p-3 rounded-lg hover:bg-surface text-text-secondary hover:text-primary-dark text-sm transition-colors pl-6"
                        >
                          {item.question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors text-left font-medium ${
                      selectedPackage?.id === pkg.id
                        ? "bg-surface-alt border-primary text-primary-dark"
                        : pkg.isFeatured 
                          ? "bg-surface border-primary/40 hover:border-primary hover:bg-surface-alt text-primary-dark"
                          : "bg-surface border-border hover:bg-surface-alt text-primary-dark"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {pkg.name} {pkg.isFeatured && "⭐"}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${selectedPackage?.id === pkg.id ? 'text-primary' : 'text-text-secondary'}`} />
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