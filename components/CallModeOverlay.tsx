"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Clock, ArrowRight, Search } from "lucide-react";
import type { Script, Stage, Objection, ScriptTurn } from "@/lib/content/types";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { ObjectionNavButtons } from "@/components/ObjectionNavButtons";
import { ObjectionChipRow } from "@/components/ObjectionChipRow";
import { CopyButton } from "@/components/CopyButton";
import { collectOperatorText } from "@/components/ScriptTurns";
import { useClientName } from "@/components/ClientNameContext";
import { buildSearchDocs, createSearcher, type SearchNav } from "@/lib/search";
import { useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { CHECKLIST_KEY_PREFIX, getTodayKey } from "@/components/DailyTimeline";
import { dailySchedule } from "@/lib/content/daily-schedule";

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Full-screen, distraction-free view for reading a script during an
 * actual call — bigger text, a running call timer, and a "next stage"
 * button, with objection lookup still reachable without leaving it.
 * `fixed inset-0` covers Sidebar/TopBar the same way app/login/page.tsx
 * already covers them, without touching AppShell.tsx: this sits on top by
 * z-index/viewport position, nothing underneath is unmounted or edited. */
export function CallModeOverlay({
  script,
  currentStage,
  currentObjection,
  turns,
  objections,
  onSelectStage,
  onSelectObjection,
  onClose,
}: {
  script: Script;
  currentStage: Stage | null;
  currentObjection: Objection | null;
  turns: ScriptTurn[];
  objections: Objection[];
  onSelectStage: (stage: Stage) => void;
  onSelectObjection: (objection: Objection) => void;
  onClose: () => void;
}) {
  const { clientName } = useClientName();
  const content = useScriptsContent();
  const searcher = useMemo(() => createSearcher(buildSearchDocs(content)), [content]);
  const [elapsed, setElapsed] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  // Read once, on open — this is a display-only glance at "how far into
  // today's plan am I", not a live subscription to DailyTimeline's own
  // state (which lives in a different part of the tree entirely, on the
  // dashboard page). Same localStorage key DailyTimeline itself reads/
  // writes, so it reflects whatever was last saved there.
  const [checklistDone, setChecklistDone] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY_PREFIX + getTodayKey());
      const checked: Record<number, boolean> = saved ? JSON.parse(saved) : {};
      setChecklistDone(Object.values(checked).filter(Boolean).length);
    } catch {
      // localStorage unavailable/corrupt — progress just shows 0
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // While typing in the inline search box, Escape should clear/blur the
      // search — not close the whole overlay and lose the call's context.
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isTyping && e.key === "Escape") return;
      if (e.key === "F2" || e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const currentIndex = currentStage ? script.stages.findIndex((s) => s.id === currentStage.id) : -1;
  const nextStage = currentIndex >= 0 ? script.stages[currentIndex + 1] : undefined;

  // Inline results only ever cover objections + stages of the script already
  // open in this Call Mode session — see searchCallMode's own comment for
  // why FAQ/competitor/package aren't offered here.
  const searchResults = useMemo(() => searcher.searchCallMode(searchQuery, script.id), [searcher, searchQuery, script.id]);

  function handleResultClick(nav: SearchNav) {
    if (nav.kind === "objection") {
      const objection = objections.find((o) => o.id === nav.objectionId);
      if (objection) onSelectObjection(objection);
    } else if (nav.kind === "script_stage") {
      const stage = script.stages.find((s) => s.id === nav.stageId);
      if (stage) onSelectStage(stage);
    }
    setSearchQuery("");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-primary-dark">
          <Clock size={18} className="text-accent" />
          {formatElapsed(elapsed)}
        </span>

        <span className="hidden items-center gap-2 text-[12px] font-medium text-text-secondary sm:flex">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-alt">
            <span
              className="block h-full rounded-full bg-accent transition-all"
              style={{ width: `${dailySchedule.length > 0 ? (checklistDone / dailySchedule.length) * 100 : 0}%` }}
            />
          </span>
          {checklistDone}/{dailySchedule.length} kunlik reja bajarildi
        </span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-surface-alt"
        >
          <X size={16} />
          Call Mode&apos;ni yopish (F2 / Esc)
        </button>
      </div>

      <div className="shrink-0 border-b border-border px-6 py-3">
        <div className="relative mx-auto max-w-3xl">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qo'ng'iroq davomida qidirish — e'tiroz yoki bosqich…"
            className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleResultClick(r.nav)}
                  className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-primary-dark transition-colors hover:border-primary/40"
                >
                  {r.title}
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="mt-2 px-1 text-[12.5px] text-text-secondary">Mos natija topilmadi.</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {currentObjection && currentStage && (
            <ObjectionNavButtons script={script} currentStage={currentStage} onSelectStage={onSelectStage} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[28px] font-bold text-primary-dark">
              {currentObjection?.label || currentStage?.label}
            </h2>
            {turns.some((t) => t.speaker === "operator") && (
              <CopyButton value={collectOperatorText(turns, clientName)} label="Barchasini nusxalash" />
            )}
          </div>
          <ScriptTurnList turns={turns} large />
          <ObjectionChipRow
            objections={objections}
            selectedObjectionId={currentObjection?.id}
            onSelect={onSelectObjection}
          />
        </div>
      </div>

      {nextStage && !currentObjection && (
        <div className="shrink-0 border-t border-border px-6 py-4">
          <button
            onClick={() => onSelectStage(nextStage)}
            className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-[16px] font-semibold text-surface shadow-soft transition-colors hover:bg-primary-hover"
          >
            Keyingi bosqich: {nextStage.label}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
