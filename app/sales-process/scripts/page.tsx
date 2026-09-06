"use client";

import { useState } from "react";
import { PageHeader } from "@/components/DocPageTemplate";
import { getMockMeta } from "@/lib/site-config";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function ScriptsPage() {
  const meta = getMockMeta("/sales-process/scripts");
  const [activeScreenContext, setActiveScreenContext] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const selectScript = (text: string) => {
    setActiveScreenContext(text);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/scripts"
        title="Jonli skriptlar va Yordamchi"
        description="O'ng paneldan kerakli e'tiroz yoki skriptni tanlang va ekranda o'qing."
        meta={meta}
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (The "TV Screen") */}
        <div className="col-span-12 md:col-span-8 bg-surface border border-border rounded-2xl p-8 min-h-[400px] flex flex-col justify-center">
          {!activeScreenContext ? (
            <p className="text-center text-text-secondary text-lg">
              O'ng paneldan kerakli e'tirozni yoki skriptni tanlang...
            </p>
          ) : (
            <div className="text-lg md:text-xl leading-relaxed text-primary-dark whitespace-pre-wrap">
              {activeScreenContext}
            </div>
          )}
        </div>

        {/* RIGHT PANEL (The "Remote Control") */}
        <div className="col-span-12 md:col-span-4 bg-surface border border-border rounded-2xl p-4 space-y-2">
          {/* Category: ?? Qimmat */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleCategory("qimmat")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-alt transition-colors font-medium text-primary-dark"
            >
              <span className="flex items-center gap-2">
                ?? Qimmat
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
        </div>
      </div>
    </div>
  );
}
