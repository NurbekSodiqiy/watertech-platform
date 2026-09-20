"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Package, CreditCard, Truck, type LucideIcon } from "lucide-react";
import { useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { useTrack } from "@/hooks/useTrack";
import { CopyButton } from "@/components/CopyButton";
import { PinButton } from "@/components/ui/PinButton";
import { useRecordRecent } from "@/hooks/useRecordRecent";
import type { Faq } from "@/lib/content/types";

type FAQItem = { id: string; question: string; answer: string };
type FAQCategory = { id: string; name: string; questions: FAQItem[] };

function buildFaqData(faqs: Faq[]): FAQCategory[] {
  return Array.from(new Set(faqs.map((f) => f.category))).map((category) => ({
    id: category,
    name: category,
    questions: faqs.filter((f) => f.category === category).map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
  }));
}

const faqCategoryIcons: Record<string, LucideIcon> = {
  "Mahsulot haqida": Package,
  Yetkazish: Truck,
  "To'lov": CreditCard,
};

/** FAQ tab — left+right panel pair for the scripts page's grid. Owns its
 * own selection state; remounts (and so resets) whenever the operator
 * switches away and back, same as the inline ternary it replaced. */
export function FaqTab({ leftPanelRef }: { leftPanelRef: RefObject<HTMLDivElement> }) {
  const { faqs } = useScriptsContent();
  const faqData = useMemo(() => buildFaqData(faqs), [faqs]);
  const [selectedFaqItem, setSelectedFaqItem] = useState<FAQItem | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const track = useTrack();
  const faqParam = useSearchParams().get("faq");

  // A pinned or recent FAQ opens as `?tab=faq&faq=<id>` — select it and open
  // its category. Clicking around afterwards is local state, as before.
  useEffect(() => {
    if (!faqParam) return;
    const category = faqData.find((c) => c.questions.some((q) => q.id === faqParam));
    const item = category?.questions.find((q) => q.id === faqParam);
    if (!category || !item) return;
    setSelectedFaqItem(item);
    setExpandedCategory(category.id);
  }, [faqParam, faqData]);

  useRecordRecent(selectedFaqItem ? { kind: "faq", id: selectedFaqItem.id } : null);

  useEffect(() => {
    if (selectedFaqItem) track("faq_view", { entityType: "faq", entityId: selectedFaqItem.question });
  }, [selectedFaqItem, track]);

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [selectedFaqItem, leftPanelRef]);

  function toggleCategory(category: string) {
    setExpandedCategory((prev) => (prev === category ? null : category));
  }

  return (
    <>
      <div
        ref={leftPanelRef}
        className="col-span-12 md:col-span-8 bg-surface border border-primary-light/50 rounded-2xl p-8 min-h-[400px] flex flex-col shadow-soft sticky top-[88px] max-h-[calc(100vh-88px-24px)] overflow-y-auto"
      >
        {!selectedFaqItem ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-text-secondary text-lg">
              O&apos;ng paneldan kerakli savolni tanlang...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-primary-dark">{selectedFaqItem.question}</h2>
              <div className="flex items-center gap-2">
                <PinButton kind="faq" id={selectedFaqItem.id} />
                <CopyButton value={selectedFaqItem.answer} label="Nusxalash" />
              </div>
            </div>
            <div className="relative rounded-2xl rounded-tl-sm border border-primary/20 border-l-[3px] border-l-primary bg-primary-light/25 px-6 py-5">
              <span aria-hidden className="absolute left-4 top-2 text-5xl leading-none text-accent/25 select-none">&#8220;</span>
              <p className="relative pl-4 text-base leading-relaxed text-primary-dark whitespace-pre-wrap">
                {selectedFaqItem.answer}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-12 md:col-span-4 bg-surface border border-primary-light/50 rounded-2xl p-4 space-y-2 shadow-soft sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
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
                    {category.questions.map((item) => (
                      <button
                        key={item.question}
                        onClick={() => setSelectedFaqItem(item)}
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
      </div>
    </>
  );
}
