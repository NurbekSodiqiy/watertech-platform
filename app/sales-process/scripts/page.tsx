"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Package, CreditCard, Percent, Truck, Clock, MapPin, Shield, Gift, FileText, User, Headset, Info, Target, Phone, Wrench, RotateCcw, Check, type LucideIcon } from "lucide-react";
import { partnershipPackagesData, PartnershipPackage } from "@/lib/mock-data/partnership-packages";
import { competitorsData, Competitor } from "@/lib/mock-data/competitors";
import { salesScriptsData, ScriptStage, ScriptTurn } from "@/lib/mock-data/sales-scripts";

// FAQ Data
type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  id: string;
  name: string;
  questions: FAQItem[];
};

const faqCategoryIcons: Record<string, LucideIcon> = {
  product: Package,
  delivery: Truck,
  payment: CreditCard,
};

const salesScriptIcons: Record<string, LucideIcon> = {
  "target-leads": Target,
  "sovuq-qongiroq": Phone,
  "ustalar-uchun": Wrench,
  "qayta-aloqa": RotateCcw,
};

const faqData: FAQCategory[] = [
  {
    id: "product",
    name: "Mahsulot haqida",
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
  const [activeTab, setActiveTab] = useState<"faq" | "packages" | "competitors" | "sales_scripts">("faq");
  
  // Savol-javob state
  const [selectedFaqItem, setSelectedFaqItem] = useState<FAQItem | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Paketlar state
  const [selectedPackage, setSelectedPackage] = useState<PartnershipPackage | null>(null);

  // Raqobatchilar state
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);

  // Sotuv skriptlari state
  const [activeSalesScriptId, setActiveSalesScriptId] = useState<string>("target-leads");
  const activeSalesScript = salesScriptsData.find(s => s.id === activeSalesScriptId) || salesScriptsData[0];
  const [selectedScriptStage, setSelectedScriptStage] = useState<ScriptStage | null>(null);
  const [expandedScriptStageId, setExpandedScriptStageId] = useState<string | null>(null);
  const [selectedScriptSubItem, setSelectedScriptSubItem] = useState<{ id: string; label: string; turns: ScriptTurn[] } | null>(null);
  const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);

  // Reset window scroll on content change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, selectedFaqItem, selectedPackage, selectedCompetitor, activeSalesScriptId, selectedScriptStage, selectedScriptSubItem]);


  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const selectFaqItem = (item: FAQItem) => {
    setSelectedFaqItem(item);
  };

  const toggleScriptStage = (stageId: string) => {
    setExpandedScriptStageId((prev) => (prev === stageId ? null : stageId));
  };

  const renderScriptTurns = (turns: ScriptTurn[]) => {
    return (
      <div className="space-y-4">
        {turns.map((turn, idx) => {
          if (turn.speaker === "note") {
            return (
              <div key={idx} className="flex gap-2 text-sm italic text-text-secondary mt-1 ml-10">
                <Info size={16} className="shrink-0 mt-0.5 opacity-70" />
                <span>{turn.text}</span>
              </div>
            );
          }
          
          const isOperator = turn.speaker === "operator";

          return (
            <div key={idx} className={`flex flex-col gap-1.5 ${!isOperator ? 'pl-8' : ''}`}>
              {turn.subStepHeader && (
                <div className={`${idx === 0 ? 'mt-0' : 'mt-8'} mb-3 text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1 w-max`}>
                  {turn.subStepHeader}
                </div>
              )}
              <div className="flex gap-3">
                <div className={`flex shrink-0 h-8 w-8 items-center justify-center rounded-full border ${isOperator ? 'bg-surface border-border text-text-secondary' : 'bg-surface-alt border-primary/20 text-accent'}`}>
                  {isOperator ? <Headset size={16} /> : <User size={16} />}
                </div>
                <div className={`flex flex-col flex-1 px-4 py-3 rounded-2xl rounded-tl-sm border ${isOperator ? 'bg-surface border-border border-l-[3px] border-l-primary' : 'bg-primary-light/25 border-primary/20'}`}>
                  <span className="text-[11px] font-bold uppercase tracking-widest mb-1 text-text-secondary">
                    {isOperator ? 'Operator' : 'Mijoz'}
                  </span>
                  <div className="text-base leading-relaxed text-primary-dark whitespace-pre-wrap">
                    {turn.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Jonli skriptlar va Yordamchi</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          O&apos;ng paneldan kerakli bo&apos;limni tanlang va ekranda javobni o&apos;qing.
        </p>
      </div>

      <div className="flex flex-wrap w-fit shrink-0 items-center gap-0.5 rounded-[20px] border border-border bg-surface-alt p-1">
        <button
          onClick={() => {
            setActiveTab("faq");
            setSelectedFaqItem(null);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "faq" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          FAQ savollar
        </button>
        <button
          onClick={() => {
            setActiveTab("packages");
            setSelectedPackage(null);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "packages" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          Hamkorlik paketlari
        </button>
        <button
          onClick={() => {
            setActiveTab("competitors");
            setSelectedCompetitor(null);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "competitors" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          Raqobatchilar
        </button>
        <button
          onClick={() => {
            setActiveTab("sales_scripts");
            setSelectedScriptStage(null);
            setSelectedScriptSubItem(null);
            setExpandedScriptStageId(null);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "sales_scripts" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          Sotuv skriptlari
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (The "TV Screen") */}
        <div className="col-span-12 md:col-span-8 bg-surface border border-border rounded-2xl p-8 min-h-[400px] flex flex-col justify-center shadow-sm">
          {activeTab === "faq" ? (
            !selectedFaqItem ? (
              <p className="text-center text-text-secondary text-lg">
                O&apos;ng paneldan kerakli savolni tanlang...
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <h2 className="text-2xl font-bold text-primary-dark">{selectedFaqItem.question}</h2>
                <div className="relative rounded-2xl rounded-tl-sm border border-primary/20 border-l-[3px] border-l-primary bg-primary-light/25 px-6 py-5">
                  <span aria-hidden className="absolute left-4 top-2 text-5xl leading-none text-accent/25 select-none">&#8220;</span>
                  <p className="relative pl-4 text-base leading-relaxed text-primary-dark whitespace-pre-wrap">
                    {selectedFaqItem.answer}
                  </p>
                </div>
              </div>
            )
          ) : activeTab === "packages" ? (
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
          ) : activeTab === "competitors" ? (
            !selectedCompetitor ? (
              <p className="text-center text-text-secondary text-lg">
                O&apos;ng paneldan kerakli raqobatchini tanlang...
              </p>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm flex flex-col h-full overflow-y-auto">
                <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-primary-dark">{selectedCompetitor.name}</h2>
                    <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${
                      selectedCompetitor.threatLevel === "Yuqori"
                        ? "border-primary/50 text-primary-dark bg-primary/5"
                        : "border-border text-text-secondary bg-surface-alt"
                    }`}>
                      Raqobat: {selectedCompetitor.threatLevel}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Assortiment</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.assortment}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Percent size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Baza chegirmasi</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.baseDiscount}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Percent size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Obyom chegirmasi (1 fura)</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.volumeDiscount}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Percent size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Retro-bonus (yillik)</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.retroBonus}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Percent size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Jami maks. chegirma</div>
                      <div className="text-[14px] font-bold text-primary-dark">{selectedCompetitor.maxDiscount}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Nasiya &amp; muddatli to&apos;lov shartlari</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.paymentTerms}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">To&apos;lov shakli</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.paymentMethod}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Yetkazish muddati</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.deliveryTime}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Truck size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Logistika &amp; MOQ shartlari</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.logistics}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Dilerlik qamrovi</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.dealerCoverage}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Shield size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Sertifikatlar &amp; garantiya</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.certificates}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border text-text-secondary">
                      <Gift size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-0.5">Marketing &amp; ustalarga takliflar</div>
                      <div className="text-[14px] font-medium text-primary-dark">{selectedCompetitor.marketingOffers}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // activeTab === "sales_scripts"
            (!selectedScriptStage && !selectedScriptSubItem) ? (
              <p className="text-center text-text-secondary text-lg">
                O&apos;ng paneldan skript bosqichini tanlang...
              </p>
            ) : (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-2xl font-bold text-primary-dark">
                    {selectedScriptSubItem?.label || selectedScriptStage?.label}
                  </h2>
                </div>
                {selectedScriptSubItem ? (
                  renderScriptTurns(selectedScriptSubItem.turns)
                ) : selectedScriptStage?.turns ? (
                  renderScriptTurns(selectedScriptStage.turns)
                ) : null}
              </div>
            )
          )}
        </div>

        {/* RIGHT PANEL (The "Remote Control") */}
        <div className="col-span-12 md:col-span-4 bg-surface border border-border rounded-2xl p-4 space-y-2 shadow-sm sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
          {activeTab === "faq" ? (
            <div className="rounded-xl border border-border overflow-hidden">
              {faqData.map((category, index) => {
                const CategoryIcon = faqCategoryIcons[category.id] ?? Package;
                return (
                <div key={category.id} className={index !== 0 ? "border-t border-border" : ""}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-alt transition-colors font-medium text-primary-dark"
                  >
                    <span className="flex items-center gap-2">
                      <CategoryIcon size={18} strokeWidth={2} className="shrink-0 text-text-secondary" />
                      {category.name}
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
                          onClick={() => selectFaqItem(item)}
                          className={`text-left w-full p-3 rounded-lg text-sm transition-colors pl-6 ${
                            selectedFaqItem?.question === item.question
                              ? "bg-surface text-primary-dark font-medium shadow-sm"
                              : "text-text-secondary hover:bg-surface hover:text-primary-dark"
                          }`}
                        >
                          {item.question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ) : activeTab === "packages" ? (
            partnershipPackagesData.map((group) => (
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
                      {pkg.name} {pkg.isFeatured && "⭐"}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${selectedPackage?.id === pkg.id ? 'text-primary' : 'text-text-secondary'}`} />
                  </button>
                ))}
              </div>
            ))
          ) : activeTab === "competitors" ? (
            <div className="flex flex-col space-y-2">
              {competitorsData.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompetitor(comp)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors text-left font-medium ${
                    selectedCompetitor?.id === comp.id
                      ? "bg-surface-alt border-primary text-primary-dark"
                      : "bg-surface border-border hover:bg-surface-alt text-primary-dark"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {comp.name}
                  </span>
                  <ChevronRight className={`w-4 h-4 ${selectedCompetitor?.id === comp.id ? 'text-primary' : 'text-text-secondary'}`} />
                </button>
              ))}
            </div>
          ) : (
            // activeTab === "sales_scripts"
            <div className="flex flex-col space-y-4">
              <div className="relative pb-2 border-b border-border z-20">
                <button
                  onClick={() => setIsScriptDropdownOpen(!isScriptDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-border bg-surface text-primary-dark font-medium transition-colors hover:bg-surface-alt shadow-sm"
                >
                  <span className="flex items-center gap-2 text-[14.5px] min-w-0">
                    {(() => {
                      const ActiveScriptIcon = salesScriptIcons[activeSalesScript.id] ?? Target;
                      return <ActiveScriptIcon size={16} className="shrink-0 text-accent" />;
                    })()}
                    <span>Skript: <span className="font-bold text-accent">{activeSalesScript.name}</span></span>
                  </span>
                  <ChevronDown className={`w-5 h-5 shrink-0 text-text-secondary transition-transform ${isScriptDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isScriptDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-30 animate-fade-slide-down">
                    {salesScriptsData.map((script, idx) => {
                      const ItemIcon = salesScriptIcons[script.id] ?? Target;
                      const isActive = activeSalesScriptId === script.id;
                      return (
                        <button
                          key={script.id}
                          onClick={() => {
                            setActiveSalesScriptId(script.id);
                            setSelectedScriptStage(null);
                            setSelectedScriptSubItem(null);
                            setExpandedScriptStageId(null);
                            setIsScriptDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 text-left pl-3 pr-4 py-3.5 text-[14px] border-l-[3px] transition-colors ${idx !== 0 ? 'border-t border-t-border' : ''} ${
                            isActive
                              ? "bg-primary-light/25 border-l-primary font-bold text-primary-dark"
                              : "border-l-transparent text-text-secondary hover:bg-surface-alt hover:text-primary-dark font-medium"
                          }`}
                        >
                          <ItemIcon size={16} className={`shrink-0 ${isActive ? 'text-accent' : 'text-text-secondary'}`} />
                          <span className="flex-1">{script.name}</span>
                          {isActive && <Check size={16} className="shrink-0 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                {activeSalesScript.stages.map((stage, index) => (
                  <div key={stage.id} className={index !== 0 ? "border-t border-border" : ""}>
                    <button
                      onClick={() => {
                        if (stage.type === 'direct') {
                          setSelectedScriptStage(stage);
                          setSelectedScriptSubItem(null);
                          setExpandedScriptStageId(null);
                        } else {
                          toggleScriptStage(stage.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-4 text-left transition-colors font-medium text-primary-dark ${
                        selectedScriptStage?.id === stage.id && stage.type === 'direct'
                          ? "bg-surface-alt" 
                          : "hover:bg-surface-alt"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {index + 1}. {stage.label}
                      </span>
                      {stage.type === 'accordion' ? (
                        expandedScriptStageId === stage.id ? (
                          <ChevronDown className="w-5 h-5 text-text-secondary" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-text-secondary" />
                        )
                      ) : (
                        <ChevronRight className={`w-5 h-5 ${selectedScriptStage?.id === stage.id ? 'text-primary' : 'text-text-secondary'}`} />
                      )}
                    </button>
                    
                    {stage.type === 'accordion' && expandedScriptStageId === stage.id && stage.subItems && (
                      <div className="bg-surface-alt border-t border-border flex flex-col p-2 space-y-1">
                        {stage.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setSelectedScriptSubItem(subItem);
                              setSelectedScriptStage(null);
                            }}
                            className={`text-left w-full p-3 rounded-lg hover:bg-surface text-sm transition-colors pl-6 font-medium ${
                              selectedScriptSubItem?.id === subItem.id
                                ? "text-primary bg-surface shadow-sm"
                                : "text-text-secondary hover:text-primary-dark"
                            }`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}