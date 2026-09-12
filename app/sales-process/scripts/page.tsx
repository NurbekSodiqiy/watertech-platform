"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronLeft, Package, CreditCard, Percent, Truck, Clock, Target, Phone, Wrench, RotateCcw, Check, Compass, Star, ArrowUpRight, Search, type LucideIcon } from "lucide-react";
import { packageGroups } from "@/lib/content/packages";
import { competitors } from "@/lib/content/competitors";
import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { faqs } from "@/lib/content/faq";
import type { Stage, Competitor, Objection, Package as PackageItem, ScriptTurn } from "@/lib/content/types";
import { CompetitorDetailPanel } from "@/components/CompetitorDetailPanel";
import { objectionToTurns } from "@/components/ScriptTurns";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { ClientNameProvider } from "@/components/ClientNameContext";
import { ClientNameInput } from "@/components/ClientNameInput";

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

const faqData: FAQCategory[] = Array.from(new Set(faqs.map((f) => f.category))).map((category) => ({
  id: category,
  name: category,
  questions: faqs.filter((f) => f.category === category).map((f) => ({ question: f.question, answer: f.answer })),
}));

const faqCategoryIcons: Record<string, LucideIcon> = {
  "Mahsulot haqida": Package,
  Yetkazish: Truck,
  "To'lov": CreditCard,
};

const salesScriptIcons: Record<string, LucideIcon> = {
  "lead-orqali-tushgan": Target,
  "sovuq-qongiroq": Phone,
  "ustalar-uchun": Wrench,
  "qayta-aloqa": RotateCcw,
};

// Last opened script/stage — restored on mount from the URL (?script=&stage=)
// if present, else from localStorage, so an F5 reload or the browser's back
// button drops the operator back where they were instead of the first stage
// of the first script every time.
const STORAGE_SCRIPT_KEY = "watertech-scripts-last-script";
const STORAGE_STAGE_KEY = "watertech-scripts-last-stage";

export default function ScriptsPage() {
  return (
    <Suspense fallback={null}>
      <ScriptsPageContent />
    </Suspense>
  );
}

function ScriptsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlScriptId = searchParams.get("script");
  const urlStageId = searchParams.get("stage");

  const [activeTab, setActiveTab] = useState<"faq" | "packages" | "competitors" | "sales_scripts">("sales_scripts");

  // Savol-javob state
  const [selectedFaqItem, setSelectedFaqItem] = useState<FAQItem | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Paketlar state
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);

  // Raqobatchilar state
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);

  // Sotuv skriptlari state — initial value comes straight from the URL query
  // when present (identical on server and client, so this is hydration-safe
  // unlike reading localStorage during render).
  const [activeSalesScriptId, setActiveSalesScriptId] = useState<string>(() =>
    urlScriptId && scripts.some((s) => s.id === urlScriptId) ? urlScriptId : scripts[0].id
  );
  const activeSalesScript = scripts.find((s) => s.id === activeSalesScriptId) || scripts[0];
  const [selectedScriptStage, setSelectedScriptStage] = useState<Stage | null>(() => {
    if (!urlScriptId || !urlStageId) return null;
    const script = scripts.find((s) => s.id === urlScriptId);
    return script?.stages.find((s) => s.id === urlStageId) ?? null;
  });
  const [expandedScriptStageId, setExpandedScriptStageId] = useState<string | null>(null);
  const [selectedObjection, setSelectedObjection] = useState<Objection | null>(null);
  const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);
  const [competitorQuery, setCompetitorQuery] = useState("");

  // Fallback restore from localStorage — only when the URL didn't already
  // specify a position (e.g. the operator navigated here fresh from the
  // sidebar rather than reloading/returning to a specific stage's link).
  useEffect(() => {
    if (urlScriptId) return;
    try {
      const savedScriptId = localStorage.getItem(STORAGE_SCRIPT_KEY);
      const savedStageId = localStorage.getItem(STORAGE_STAGE_KEY);
      const script = savedScriptId ? scripts.find((s) => s.id === savedScriptId) : undefined;
      if (!script) return;
      setActiveSalesScriptId(script.id);
      setSelectedScriptStage(savedStageId ? script.stages.find((s) => s.id === savedStageId) ?? null : null);
    } catch {
      // localStorage unavailable — position just won't be restored
    }
    // Restoring is a one-time, mount-only concern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL and localStorage in sync with the current script/stage
  // whenever the operator is on the scripts tab, so both a reload and a
  // later visit land back in the same place.
  useEffect(() => {
    if (activeTab !== "sales_scripts") return;
    try {
      localStorage.setItem(STORAGE_SCRIPT_KEY, activeSalesScriptId);
      if (selectedScriptStage) localStorage.setItem(STORAGE_STAGE_KEY, selectedScriptStage.id);
      else localStorage.removeItem(STORAGE_STAGE_KEY);
    } catch {
      // localStorage unavailable — position just won't persist
    }
    const params = new URLSearchParams();
    params.set("script", activeSalesScriptId);
    if (selectedScriptStage) params.set("stage", selectedScriptStage.id);
    router.replace(`/sales-process/scripts?${params.toString()}`, { scroll: false });
  }, [activeTab, activeSalesScriptId, selectedScriptStage, router]);

  // The left ("TV screen") panel scrolls internally now instead of the
  // whole window — resetting it to the top on selection change no longer
  // yanks the operator away from wherever they were reading on the page.
  const leftPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [activeTab, selectedFaqItem, selectedPackage, selectedCompetitor, activeSalesScriptId, selectedScriptStage, selectedObjection]);

  // Stable reference for ScriptTurnList's memo to actually bail on —
  // objectionToTurns(...) builds a fresh array every call otherwise.
  const currentTurns: ScriptTurn[] | null = useMemo(() => {
    if (selectedObjection) return objectionToTurns(selectedObjection);
    return selectedScriptStage?.turns ?? null;
  }, [selectedObjection, selectedScriptStage]);

  // Keyboard shortcuts — only while on the scripts tab, and never while the
  // operator is typing somewhere (client-name field, a future search box).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping || activeTab !== "sales_scripts") return;

      if (e.key >= "1" && e.key <= "6") {
        const stage = activeSalesScript.stages[Number(e.key) - 1];
        if (stage) {
          setSelectedObjection(null);
          setSelectedScriptStage(stage);
          setExpandedScriptStageId(null);
        }
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const stages = activeSalesScript.stages;
        const currentIndex = selectedScriptStage ? stages.findIndex((s) => s.id === selectedScriptStage.id) : -1;
        const nextIndex =
          e.key === "ArrowRight"
            ? Math.min(currentIndex < 0 ? 0 : currentIndex + 1, stages.length - 1)
            : Math.max(currentIndex < 0 ? 0 : currentIndex - 1, 0);
        const stage = stages[nextIndex];
        if (stage) {
          e.preventDefault();
          setSelectedObjection(null);
          setSelectedScriptStage(stage);
          setExpandedScriptStageId(null);
        }
        return;
      }

      if (e.key === "Escape" && (selectedObjection || selectedScriptStage)) {
        setSelectedObjection(null);
        setSelectedScriptStage(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, activeSalesScript, selectedScriptStage, selectedObjection]);

  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const selectFaqItem = (item: FAQItem) => {
    setSelectedFaqItem(item);
  };

  const toggleScriptStage = (stageId: string) => {
    setExpandedScriptStageId((prev) => (prev === stageId ? null : stageId));
  };

  const objectionsForStage = (stage: Stage) =>
    stage.objectionIds
      .map((id) => objections.find((o) => o.id === id))
      .filter((o): o is Objection => !!o);

  // Used by the always-visible objection chip row — jumps straight to an
  // objection's response from anywhere, one click, no accordion digging.
  const selectObjection = (o: Objection) => {
    setActiveTab("sales_scripts");
    setSelectedObjection(o);
    const stage = activeSalesScript.stages.find((s) => s.objectionIds.includes(o.id));
    if (stage) setSelectedScriptStage(stage);
  };

  const filteredCompetitors = useMemo(
    () => competitors.filter((c) => c.name.toLowerCase().includes(competitorQuery.trim().toLowerCase())),
    [competitorQuery]
  );

  return (
    <ClientNameProvider>
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Jonli skriptlar va Yordamchi</h1>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-border border-l-[3px] border-l-primary bg-primary-light/10 px-4 py-3">
          <Compass size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-text-secondary">
            Maqsadimiz naxt savdoga ko&apos;proq urg&apos;u berish, eng so&apos;ngi chora nasiya bo&apos;lishi kerak. Mijoz naxt berishga puli yo&apos;q emas, aynan bizga berishga puli yo&apos;q deb qabul qilishimiz kerak.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap w-fit shrink-0 items-center gap-0.5 rounded-[20px] border border-border bg-surface-alt p-1">
          <button
            onClick={() => {
              setActiveTab("sales_scripts");
              setSelectedScriptStage(null);
              setSelectedObjection(null);
              setExpandedScriptStageId(null);
            }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "sales_scripts" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Sotuv skriptlari
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
              setActiveTab("faq");
              setSelectedFaqItem(null);
            }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "faq" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            FAQ savollar
          </button>
        </div>

        <ClientNameInput />
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (The "TV Screen") — scrolls internally (same bounded
            sticky pattern as the right panel below) so switching tabs/
            stages/objections only resets this panel's own scroll, not the
            whole window. */}
        <div
          ref={leftPanelRef}
          className="col-span-12 md:col-span-8 bg-surface border border-primary-light/50 rounded-2xl p-8 min-h-[400px] flex flex-col shadow-soft sticky top-[88px] max-h-[calc(100vh-88px-24px)] overflow-y-auto"
        >
          {activeTab === "faq" ? (
            !selectedFaqItem ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-text-secondary text-lg">
                  O&apos;ng paneldan kerakli savolni tanlang...
                </p>
              </div>
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
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-text-secondary text-lg">
                  O&apos;ng paneldan kerakli paketni tanlang...
                </p>
              </div>
            ) : (
              <div className={`rounded-xl border ${selectedPackage.isFeatured ? 'border-primary' : 'border-border'} bg-surface p-6 shadow-sm flex flex-col`}>
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-2xl font-bold text-primary-dark flex items-center gap-2">
                    {selectedPackage.name}
                    {selectedPackage.isFeatured && (
                      <Star size={20} className="text-accent" fill="currentColor" aria-label="Tavsiya etiladi" />
                    )}
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
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-text-secondary text-lg">
                  O&apos;ng paneldan kerakli raqobatchini tanlang...
                </p>
              </div>
            ) : (
              <CompetitorDetailPanel competitor={selectedCompetitor} />
            )
          ) : (
            // activeTab === "sales_scripts"
            (!selectedScriptStage && !selectedObjection) ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-text-secondary text-lg">
                  O&apos;ng paneldan skript bosqichini tanlang...
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="mb-8 border-b border-border pb-4">
                  {selectedObjection && selectedScriptStage && (
                    <button
                      onClick={() => setSelectedObjection(null)}
                      className="mb-2 flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover"
                    >
                      <ChevronLeft size={14} />
                      {selectedScriptStage.label}ga qaytish
                    </button>
                  )}
                  <h2 className="text-2xl font-bold text-primary-dark">
                    {selectedObjection?.label || selectedScriptStage?.label}
                  </h2>
                </div>
                {currentTurns && <ScriptTurnList turns={currentTurns} />}
              </div>
            )
          )}
        </div>

        {/* Always-visible e'tirozlar chip row — one click during a live call,
            no accordion to open first. Sits directly under the left panel. */}
        <div className="col-span-12 md:col-span-8 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-text-secondary shrink-0">Tez e&apos;tirozlar:</span>
          {objections.map((o) => (
            <button
              key={o.id}
              onClick={() => selectObjection(o)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                selectedObjection?.id === o.id
                  ? "border-primary bg-primary text-surface shadow-softer"
                  : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-primary-dark"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* RIGHT PANEL (The "Remote Control") */}
        <div className="col-span-12 md:col-span-4 bg-surface border border-primary-light/50 rounded-2xl p-4 space-y-2 shadow-soft sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
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
            packageGroups.map((group) => (
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
                    <ChevronRight className={`w-4 h-4 ${selectedPackage?.id === pkg.id ? 'text-primary' : 'text-text-secondary'}`} />
                  </button>
                ))}
              </div>
            ))
          ) : activeTab === "competitors" ? (
            <div className="flex flex-col space-y-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  value={competitorQuery}
                  onChange={(e) => setCompetitorQuery(e.target.value)}
                  placeholder="Raqobatchi nomi bo'yicha qidirish…"
                  className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
              </div>
              {filteredCompetitors.length === 0 ? (
                <p className="px-1 py-4 text-center text-[13px] text-text-secondary">Mos raqobatchi topilmadi.</p>
              ) : (
                filteredCompetitors.map((comp) => (
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
                ))
              )}
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
                    {scripts.map((script, idx) => {
                      const ItemIcon = salesScriptIcons[script.id] ?? Target;
                      const isActive = activeSalesScriptId === script.id;
                      return (
                        <button
                          key={script.id}
                          onClick={() => {
                            setActiveSalesScriptId(script.id);
                            setSelectedScriptStage(null);
                            setSelectedObjection(null);
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

              <Link
                href={`/sales-process/scripts/${activeSalesScript.id}`}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-surface-alt hover:text-primary-dark"
              >
                Batafsil ko'rish
                <ArrowUpRight size={14} />
              </Link>

              <div className="rounded-xl border border-border overflow-hidden">
                {activeSalesScript.stages.map((stage, index) => {
                  const stageObjections = objectionsForStage(stage);
                  const isAccordion = stageObjections.length > 0;
                  return (
                  <div key={stage.id} className={index !== 0 ? "border-t border-border" : ""}>
                    <button
                      onClick={() => {
                        if (!isAccordion) {
                          setSelectedScriptStage(stage);
                          setSelectedObjection(null);
                          setExpandedScriptStageId(null);
                        } else {
                          toggleScriptStage(stage.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-4 text-left transition-colors font-medium text-primary-dark ${
                        selectedScriptStage?.id === stage.id && !isAccordion
                          ? "bg-surface-alt"
                          : "hover:bg-surface-alt"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {index + 1}. {stage.label}
                      </span>
                      {isAccordion ? (
                        expandedScriptStageId === stage.id ? (
                          <ChevronDown className="w-5 h-5 text-text-secondary" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-text-secondary" />
                        )
                      ) : (
                        <ChevronRight className={`w-5 h-5 ${selectedScriptStage?.id === stage.id ? 'text-primary' : 'text-text-secondary'}`} />
                      )}
                    </button>

                    {isAccordion && expandedScriptStageId === stage.id && (
                      <div className="bg-surface-alt border-t border-border flex flex-col p-2 space-y-1">
                        {stageObjections.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => {
                              setSelectedObjection(o);
                              setSelectedScriptStage(stage);
                            }}
                            className={`text-left w-full p-3 rounded-lg hover:bg-surface text-sm transition-colors pl-6 font-medium ${
                              selectedObjection?.id === o.id
                                ? "text-primary bg-surface shadow-sm"
                                : "text-text-secondary hover:text-primary-dark"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                        <Link
                          href="/sales-process/objections"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 pl-6 text-[13px] font-medium text-primary hover:bg-surface hover:text-primary-dark"
                        >
                          E'tirozlar bo'limiga qarang
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ClientNameProvider>
  );
}
