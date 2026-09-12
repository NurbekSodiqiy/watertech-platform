"use client";

import { useEffect, useState } from "react";
import { X, Clock, ArrowRight } from "lucide-react";
import type { Script, Stage, Objection, ScriptTurn } from "@/lib/content/types";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { ObjectionNavButtons } from "@/components/ObjectionNavButtons";
import { ObjectionChipRow } from "@/components/ObjectionChipRow";

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
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-primary-dark">
          <Clock size={18} className="text-accent" />
          {formatElapsed(elapsed)}
        </span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-surface-alt"
        >
          <X size={16} />
          Call Mode&apos;ni yopish (F2 / Esc)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {currentObjection && currentStage && (
            <ObjectionNavButtons script={script} currentStage={currentStage} onSelectStage={onSelectStage} />
          )}
          <h2 className="text-[28px] font-bold text-primary-dark">
            {currentObjection?.label || currentStage?.label}
          </h2>
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
