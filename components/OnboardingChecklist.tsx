"use client";

import { useState, useEffect } from "react";
import { Lightbulb, CheckSquare, Square, ChevronDown, Calendar } from "lucide-react";
import { useTrack } from "@/hooks/useTrack";
import { onboardingDays } from "@/lib/content/onboarding";

export function OnboardingChecklist() {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(1);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("onboarding_checklist");
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const track = useTrack();
  const toggleCheck = (index: number) => {
    const newChecked = { ...checkedItems, [index]: !checkedItems[index] };
    setCheckedItems(newChecked);
    localStorage.setItem("onboarding_checklist", JSON.stringify(newChecked));
    track("checklist_toggle", { entityType: "onboarding_item", entityId: String(index), meta: { checked: newChecked[index] } });
  };

  const toggleDay = (day: number) => {
    setOpenDay(openDay === day ? null : day);
  };

  const checklist = [
    "1-kun: Kompaniya missiyasi va qadriyatlarini o'qish.",
    "2-kun: Jamoa bilan tanishish (Kontaktlar bo'limi).",
    "3-kun: Mahsulot turlarini yodlash (Katalog).",
    "4-kun: Skriptlarni o'rganish va imtihon topshirish."
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">

      {/* Intro Message */}
      <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-accent">
        <Lightbulb className="mt-0.5 shrink-0" size={20} />
        <p className="text-[15px] leading-relaxed">
          <strong>Xush kelibsiz!</strong> Ushbu 4 kunlik rejani bajaring va jamoamizning to&apos;laqonli a&apos;zosiga aylaning.
        </p>
      </div>

      {/* Checklist */}
      <section>
        <h2 className="mb-4 text-[18px] font-bold text-primary-dark">4 kunlik checklist</h2>
        {mounted ? (
          <div className="space-y-2">
            {checklist.map((item, i) => {
              const isChecked = !!checkedItems[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isChecked
                      ? "border-status-ok bg-status-ok/5 text-text-secondary"
                      : "border-border bg-surface-alt hover:border-accent hover:bg-accent/5"
                  }`}
                >
                  <span className={`shrink-0 ${isChecked ? "text-status-ok" : "text-text-secondary/50"}`}>
                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </span>
                  <span className={`text-[15px] ${isChecked ? "line-through opacity-70" : "font-medium text-primary-dark"}`}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-[200px] animate-pulse rounded-xl bg-surface-alt" />
        )}
      </section>

      <hr className="border-border" />

      {/* Call operator 4-day program — merged in from the former /company/onboarding/call-operator page */}
      <section className="space-y-4">
        {onboardingDays.map((dayData) => {
          const isOpen = openDay === dayData.day;
          return (
            <div key={dayData.day} className="overflow-hidden rounded-2xl border border-border shadow-soft">
              <button
                onClick={() => toggleDay(dayData.day)}
                className="flex w-full items-stretch text-left"
              >
                <div className="flex shrink-0 items-center justify-center bg-surface px-5 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Calendar size={20} />
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-between gap-4 bg-accent px-5 py-5 transition-colors hover:bg-accent-hover">
                  <h2 className="text-[16px] font-bold text-on-accent">
                    {dayData.day}-kun: {dayData.title}
                  </h2>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-on-accent transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-surface-alt p-6">
                  <p className="mb-4 text-[15px] text-primary-dark">
                    <strong>Maqsad:</strong> {dayData.objective}
                  </p>
                  <ul className="space-y-2.5">
                    {dayData.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2.5 text-[14.5px] leading-relaxed text-text-secondary">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>
                          {item.emphasis && <strong>{item.emphasis} </strong>}
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </section>

    </div>
  );
}
