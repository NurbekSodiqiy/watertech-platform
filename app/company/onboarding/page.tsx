"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Lightbulb, CheckSquare, Square, ChevronRight, PhoneCall } from "lucide-react";

export default function OnboardingPage() {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("onboarding_checklist");
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleCheck = (index: number) => {
    const newChecked = { ...checkedItems, [index]: !checkedItems[index] };
    setCheckedItems(newChecked);
    localStorage.setItem("onboarding_checklist", JSON.stringify(newChecked));
  };

  const checklist = [
    "1-kun: Kompaniya missiyasi va qadriyatlarini o'qish.",
    "2-kun: Jamoa bilan tanishish (Kontaktlar bo'limi).",
    "3-kun: Mahsulot turlarini yodlash (Katalog).",
    "4-kun: Skriptlarni o'rganish va imtihon topshirish."
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/onboarding" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Onboarding</h1>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">
        
        {/* Intro Message */}
        <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-accent">
          <Lightbulb className="mt-0.5 shrink-0" size={20} />
          <p className="text-[15px] leading-relaxed">
            <strong>Xush kelibsiz!</strong> Ushbu 4 kunlik rejani bajaring va jamoamizning to'laqonli a'zosiga aylaning.
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

        {/* Roles */}
        <section>
          <h2 className="mb-4 text-[18px] font-bold text-primary-dark">Rol bo'yicha batafsil dastur</h2>
          <Link
            href="/company/onboarding/call-operator"
            className="group flex items-center justify-between rounded-xl border border-border bg-surface-alt p-5 transition-all hover:border-accent hover:bg-accent/5 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-accent/20 group-hover:text-accent">
                <PhoneCall size={24} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-primary-dark transition-colors group-hover:text-accent">Call operator</h3>
                <p className="text-[14px] text-text-secondary">4 kunlik batafsil dastur bilan tanishing</p>
              </div>
            </div>
            <ChevronRight className="text-border transition-colors group-hover:text-accent" size={20} />
          </Link>
        </section>

      </div>
    </div>
  );
}
