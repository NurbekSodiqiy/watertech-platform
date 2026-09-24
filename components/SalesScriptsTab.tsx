"use client";

import { Link } from "@/i18n/routing";
import { useState, type RefObject } from "react";
import { ChevronDown, ChevronRight, Check, ArrowUpRight, Target, Phone, PhoneCall, Wrench, RotateCcw, type LucideIcon } from "lucide-react";
import { m, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Script, Stage, Objection, ScriptTurn } from "@/lib/content/types";
import { useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { ObjectionNavButtons } from "@/components/ObjectionNavButtons";
import { ObjectionCompetitorSearch } from "@/components/ObjectionCompetitorSearch";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { CopyButton } from "@/components/CopyButton";
import { collectOperatorText, turnsCopyEntity } from "@/components/ScriptTurns";
import { useClientName } from "@/components/ClientNameContext";
import { Pressable } from "@/components/motion/Pressable";
import { PinButton } from "@/components/ui/PinButton";
import { noTransition, springs } from "@/lib/motion/tokens";

const salesScriptIcons: Record<string, LucideIcon> = {
  "lead-orqali-tushgan": Target,
  "sovuq-qongiroq": Phone,
  "ustalar-uchun": Wrench,
  "qayta-aloqa": RotateCcw,
};

/** Sliding highlight behind the selected stage row, same pattern as Sidebar's ActivePill. */
function StagePill() {
  const reduce = useReducedMotion();
  return (
    <m.span
      layoutId="scripts-stage-pill"
      className="absolute inset-0 bg-surface-alt"
      transition={reduce ? noTransition : springs.snappy}
      aria-hidden
    />
  );
}

function objectionsForStage(stage: Stage, objections: Objection[]): Objection[] {
  return stage.objectionIds
    .map((id) => objections.find((o) => o.id === id))
    .filter((o): o is Objection => !!o);
}

/** Sotuv skriptlari tab — left+right panel pair. The active script/stage/
 * objection is URL-driven and lives in the parent page (keyboard shortcuts,
 * Call Mode, and the objection chip row all need to read and drive it too),
 * so this component only owns purely-local UI toggles: the script dropdown,
 * and which stage accordion is open. */
export function SalesScriptsTab({
  leftPanelRef,
  activeSalesScript,
  selectedScriptStage,
  selectedObjection,
  currentTurns,
  onSelectScript,
  onSelectStage,
  onSelectObjection,
  onOpenCallMode,
}: {
  leftPanelRef: RefObject<HTMLDivElement>;
  activeSalesScript: Script;
  selectedScriptStage: Stage | null;
  selectedObjection: Objection | null;
  currentTurns: ScriptTurn[] | null;
  onSelectScript: (id: string) => void;
  onSelectStage: (stage: Stage) => void;
  onSelectObjection: (o: Objection) => void;
  /** Same open-Call-Mode function F2 already calls — a clickable entry
   * point for operators whose laptop maps F2 to a hardware function
   * (screen brightness etc.) before it ever reaches the browser. */
  onOpenCallMode: () => void;
}) {
  const { clientName } = useClientName();
  const { scripts, objections, competitors } = useScriptsContent();
  const [expandedScriptStageId, setExpandedScriptStageId] = useState<string | null>(null);
  const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);
  const t = useTranslations("scripts");
  const tCommon = useTranslations("common");
  const copyEntity = turnsCopyEntity(selectedObjection, selectedScriptStage);

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
              {t("selectPrompt")}
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
                <div className="flex flex-wrap items-center gap-2">
                  {selectedObjection && <PinButton kind="objection" id={selectedObjection.id} />}
                  {currentTurns && currentTurns.some((turn) => turn.speaker === "operator") && (
                    <CopyButton
                      value={collectOperatorText(currentTurns, clientName)}
                      label={tCommon("copyAll")}
                      entityType={copyEntity?.entityType}
                      entityId={copyEntity?.entityId}
                    />
                  )}
                  <Pressable
                    type="button"
                    onClick={onOpenCallMode}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    <PhoneCall size={15} />
                    {t("callModeButton")}
                  </Pressable>
                </div>
              </div>
            </div>
            {selectedObjection && <ObjectionCompetitorSearch competitors={competitors} />}
            {currentTurns && (
              <ScriptTurnList
                turns={currentTurns}
                copyEntityType={copyEntity?.entityType}
                copyEntityId={copyEntity?.entityId}
              />
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL (The "Remote Control") */}
      <div className="col-span-12 md:col-span-4 bg-surface border border-primary-light/50 rounded-2xl p-4 space-y-2 shadow-soft sticky top-[88px] self-start max-h-[calc(100vh-88px-24px)] overflow-y-auto flex flex-col">
        <div className="flex flex-col space-y-4">
          <div className="relative flex items-center gap-2 pb-2 border-b border-border z-20">
            <button
              onClick={() => setIsScriptDropdownOpen(!isScriptDropdownOpen)}
              className="min-w-0 flex-1 flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-border bg-surface text-primary-dark font-medium transition-colors hover:bg-surface-alt shadow-sm"
            >
              <span className="flex items-center gap-2 text-[14.5px] min-w-0">
                {(() => {
                  const ActiveScriptIcon = salesScriptIcons[activeSalesScript.id] ?? Target;
                  return <ActiveScriptIcon size={16} className="shrink-0 text-accent" />;
                })()}
                <span>{t("scriptPrefix")} <span className="font-bold text-accent">{activeSalesScript.name}</span></span>
              </span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-text-secondary transition-transform ${isScriptDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            <PinButton kind="script" id={activeSalesScript.id} />

            {isScriptDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-30 animate-fade-slide-down">
                {scripts.map((script, idx) => {
                  const ItemIcon = salesScriptIcons[script.id] ?? Target;
                  const isActive = activeSalesScript.id === script.id;
                  return (
                    <button
                      key={script.id}
                      onClick={() => {
                        onSelectScript(script.id);
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
            {t("viewDetails")}
            <ArrowUpRight size={14} />
          </Link>

          <div className="rounded-xl border border-border overflow-hidden">
            {activeSalesScript.stages.map((stage, index) => {
              const stageObjections = objectionsForStage(stage, objections);
              const isAccordion = stageObjections.length > 0;
              return (
                <div key={stage.id} className={index !== 0 ? "border-t border-border" : ""}>
                  <button
                    onClick={() => {
                      if (!isAccordion) {
                        onSelectStage(stage);
                        setExpandedScriptStageId(null);
                      } else {
                        toggleScriptStage(stage.id);
                      }
                    }}
                    className={`relative w-full flex items-center justify-between p-4 text-left transition-colors font-medium text-primary-dark ${
                      selectedScriptStage?.id === stage.id && !isAccordion ? "" : "hover:bg-surface-alt"
                    }`}
                  >
                    {selectedScriptStage?.id === stage.id && !isAccordion && <StagePill />}
                    <span className="relative flex items-center gap-2">
                      {index + 1}. {stage.label}
                    </span>
                    {isAccordion ? (
                      expandedScriptStageId === stage.id ? (
                        <ChevronDown className="relative w-5 h-5 text-text-secondary" />
                      ) : (
                        <ChevronRight className="relative w-5 h-5 text-text-secondary" />
                      )
                    ) : (
                      <ChevronRight className={`relative w-5 h-5 ${selectedScriptStage?.id === stage.id ? "text-primary" : "text-text-secondary"}`} />
                    )}
                  </button>

                  {isAccordion && expandedScriptStageId === stage.id && (
                    <div className="bg-surface-alt border-t border-border flex flex-col p-2 space-y-1">
                      {stageObjections.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => onSelectObjection(o)}
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
                        {t("seeObjections")}
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
