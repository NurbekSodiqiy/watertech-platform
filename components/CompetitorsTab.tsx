"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { Search, ChevronRight } from "lucide-react";
import { competitors } from "@/lib/content/competitors";
import type { Competitor } from "@/lib/content/types";
import { CompetitorDetailPanel } from "@/components/CompetitorDetailPanel";
import { useTrack } from "@/hooks/useTrack";

/** Raqobatchilar tab — left+right panel pair. Owns its own selection and
 * search state; remounts (and so resets) whenever the operator switches
 * away and back, same as the inline ternary it replaced. */
export function CompetitorsTab({ leftPanelRef }: { leftPanelRef: RefObject<HTMLDivElement> }) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [competitorQuery, setCompetitorQuery] = useState("");
  const track = useTrack();

  useEffect(() => {
    if (selectedCompetitor) track("competitor_view", { entityType: "competitor", entityId: selectedCompetitor.id });
  }, [selectedCompetitor, track]);

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [selectedCompetitor, leftPanelRef]);

  const filteredCompetitors = useMemo(
    () => competitors.filter((c) => c.name.toLowerCase().includes(competitorQuery.trim().toLowerCase())),
    [competitorQuery]
  );

  return (
    <>
      <div
        ref={leftPanelRef}
        className="col-span-12 md:col-span-8 bg-surface border border-primary-light/50 rounded-2xl p-8 min-h-[400px] flex flex-col shadow-soft sticky top-[88px] max-h-[calc(100vh-88px-24px)] overflow-y-auto"
      >
        {!selectedCompetitor ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-text-secondary text-lg">
              O&apos;ng paneldan kerakli raqobatchini tanlang...
            </p>
          </div>
        ) : (
          <CompetitorDetailPanel competitor={selectedCompetitor} />
        )}
      </div>

      <div className="col-span-12 md:col-span-4 bg-surface border border-primary-light/50 rounded-2xl p-4 space-y-2 shadow-soft sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
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
                <span className="flex items-center gap-2">{comp.name}</span>
                <ChevronRight className={`w-4 h-4 ${selectedCompetitor?.id === comp.id ? "text-primary" : "text-text-secondary"}`} />
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
