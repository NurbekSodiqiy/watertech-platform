"use client";

import Link from "next/link";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { ChevronDown, ChevronRight, Check, ArrowUpRight, Target, Phone, PhoneCall, Wrench, RotateCcw, type LucideIcon } from "lucide-react";
import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { competitors } from "@/lib/content/competitors";
import type { Script, Stage, Objection, ScriptTurn } from "@/lib/content/types";
import { ObjectionNavButtons } from "@/components/ObjectionNavButtons";
import { ObjectionCompetitorSearch } from "@/components/ObjectionCompetitorSearch";
import { ScriptTurnList } from "@/components/ScriptTurnList";

const salesScriptIcons: Record<string, LucideIcon> = {
  "lead-orqali-tushgan": Target,
  "sovuq-qongiroq": Phone,
  "ustalar-uchun": Wrench,
  "qayta-aloqa": RotateCcw,
};

function objectionsForStage(stage: Stage): Objection[] {
  return stage.objectionIds
    .map((id) => objections.find((o) => o.id === id))
    .filter((o): o is Objection => !!o);
}

/** Sotuv skriptlari tab — left+right panel pair. Unlike the other three
 * tabs, its state (active script, stage, objection, dropdown/accordion
 * open state) stays lifted in the parent page: keyboard shortcuts, URL
 * sync, Call Mode, and the objection chip row all need to read and drive
 * it too, so it isn't actually tab-local. This component is the render +
 * a thin layer of purely-local UI toggles (the script dropdown, which
 * stage accordion is open). */
export function SalesScriptsTab({
  leftPanelRef,
  activeSalesScript,
  activeSalesScriptId,
  selectedScriptStage,
  selectedObjection,
  expandedScriptStageId,
  isScriptDropdownOpen,
  currentTurns,
  setActiveSalesScriptId,
  setSelectedScriptStage,
  setSelectedObjection,
  setExpandedScriptStageId,
  setIsScriptDropdownOpen,
  onSelectStage,
  onOpenCallMode,
}: {
  leftPanelRef: RefObject<HTMLDivElement>;
  activeSalesScript: Script;
  activeSalesScriptId: string;
  selectedScriptStage: Stage | null;
  selectedObjection: Objection | null;
  expandedScriptStageId: string | null;
  isScriptDropdownOpen: boolean;
  currentTurns: ScriptTurn[] | null;
  setActiveSalesScriptId: Dispatch<SetStateAction<string>>;
  setSelectedScriptStage: Dispatch<SetStateAction<Stage | null>>;
  setSelectedObjection: Dispatch<SetStateAction<Objection | null>>;
  setExpandedScriptStageId: Dispatch<SetStateAction<string | null>>;
  setIsScriptDropdownOpen: Dispatch<SetStateAction<boolean>>;
  onSelectStage: (stage: Stage) => void;
  /** Same open-Call-Mode function F2 already calls — a clickable entry
   * point for operators whose laptop maps F2 to a hardware function
   * (screen brightness etc.) before it ever reaches the browser. */
  onOpenCallMode: () => void;
}) {
  function toggleScriptStage(stageId: string) {
    setExpandedScriptStageId((prev) => (prev === stageId ? null : stageId));
  }

  return (
    <>
      {/* LEFT PANEL (The "TV Screen") — scrolls internally (same bounded
          sticky pattern as the right panel below) so switching stages/
          objections only resets this panel's own scroll, not the whole
          window. */}
      <div
        ref={leftPanelRef}
        className="col-span-12 md:col-span-8 bg-surface border border-primary-light/50 rounded-2xl p-8 min-h-[400px] flex flex-col shadow-soft sticky top-[88px] max-h-[calc(100vh-88px-24px)] overflow-y-auto"
      >
        {!selectedScriptStage && !selectedObjection ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-text-secondary text-lg">
              O&apos;ng paneldan skript bosqichini tanlang...
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-8 border-b border-border pb-4">
              {selectedObjection && selectedScriptStage && (
                <ObjectionNavButtons
                  script={activeSalesScript}
                  currentStage={selectedScriptStage}
                  onSelectStage={onSelectStage}
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-primary-dark">
                  {selectedObjection?.label || selectedScriptStage?.label}
                </h2>
                <button
                  type="button"
                  onClick={onOpenCallMode}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  <PhoneCall size={15} />
                  Qo&apos;ng&apos;iroq rejimi
                </button>
              </div>
            </div>
            {selectedObjection && <ObjectionCompetitorSearch competitors={competitors} />}
            {currentTurns && <ScriptTurnList turns={currentTurns} />}
          </div>
        )}
      </div>

      {/* RIGHT PANEL (The "Remote Control") */}
      <div className="col-span-12 md:col-span-4 bg-surface border border-primary-light/50 rounded-2xl p-4 space-y-2 shadow-soft sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
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
              <ChevronDown className={`w-5 h-5 shrink-0 text-text-secondary transition-transform ${isScriptDropdownOpen ? "rotate-180" : ""}`} />
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
                      className={`w-full flex items-center gap-3 text-left pl-3 pr-4 py-3.5 text-[14px] border-l-[3px] transition-colors ${idx !== 0 ? "border-t border-t-border" : ""} ${
                        isActive
                          ? "bg-primary-light/25 border-l-primary font-bold text-primary-dark"
                          : "border-l-transparent text-text-secondary hover:bg-surface-alt hover:text-primary-dark font-medium"
                      }`}
                    >
                      <ItemIcon size={16} className={`shrink-0 ${isActive ? "text-accent" : "text-text-secondary"}`} />
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
            Batafsil ko&apos;rish
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
                      selectedScriptStage?.id === stage.id && !isAccordion ? "bg-surface-alt" : "hover:bg-surface-alt"
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
                      <ChevronRight className={`w-5 h-5 ${selectedScriptStage?.id === stage.id ? "text-primary" : "text-text-secondary"}`} />
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
                        E&apos;tirozlar bo&apos;limiga qarang
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
