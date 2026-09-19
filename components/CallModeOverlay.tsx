"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Clock, ArrowRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Script, Stage, Objection, ScriptTurn } from "@/lib/content/types";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { ObjectionNavButtons } from "@/components/ObjectionNavButtons";
import { ObjectionChipRow } from "@/components/ObjectionChipRow";
import { CopyButton } from "@/components/CopyButton";
import { collectOperatorText } from "@/components/ScriptTurns";
import { useClientName } from "@/components/ClientNameContext";
import { buildSearchDocs, createSearcher, type SearchNav } from "@/lib/search";
import { useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { useNow } from "@/hooks/useNow";
import { useUserState } from "@/hooks/useUserState";
import { dailyKeyForDay, dateKey } from "@/lib/user-state/keys";
import { dailySchedule } from "@/lib/content/daily-schedule";
import { Dialog } from "@/components/ui/Dialog";
import { setCallModeOpen } from "@/components/copilot/call-mode-store";

const TITLE_ID = "call-mode-title";

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
  const t = useTranslations("callMode");
  const tCommon = useTranslations("common");
  const searcher = useMemo(() => createSearcher(buildSearchDocs(content)), [content]);
  const [elapsed, setElapsed] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  // A display-only glance at "how far into today's plan am I". Same
  // user_state key DailyTimeline reads and writes, so the two now share one
  // store rather than passing a number through localStorage: whichever tab or
  // device last ticked something is what shows here.
  const now = useNow();
  const day = now ? dateKey(now) : null;
  const dailyState = useMemo(() => dailyKeyForDay(day ?? "1970-01-01"), [day]);
  const [daily] = useUserState(day ? dailyState.key : null, dailyState.schema, dailyState.defaultValue, dailyState);
  const checklistDone = Object.values(daily.checked).filter(Boolean).length;

  // Lets AppShell's floating Copilot button step aside while this covers the screen.
  useEffect(() => {
    setCallModeOpen(true);
    return () => setCallModeOpen(false);
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // While typing in the inline search box, Escape should clear/blur the
  // search — not close the whole overlay and lose the call's context.
  // <Dialog> owns Escape otherwise; F2 (the shortcut that opened Call Mode)
  // stays here, since it is this overlay's own toggle.
  const shouldCloseOnEscape = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    return !target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA");
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "F2") return;
      e.preventDefault();
      onClose();
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
    <Dialog
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      containerClassName="z-[100]"
      panelClassName="flex h-full w-full flex-col bg-background"
      backdrop={false}
      motionStyle="fade"
      shouldCloseOnEscape={shouldCloseOnEscape}
    >
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
          {t("planProgress", { done: checklistDone, total: dailySchedule.length })}
        </span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-surface-alt"
        >
          <X size={16} />
          {t("closeButton")}
        </button>
      </div>

      <div className="shrink-0 border-b border-border px-6 py-3">
        <div className="relative mx-auto max-w-3xl">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
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
            <p className="mt-2 px-1 text-[12.5px] text-text-secondary">{t("noResults")}</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {currentObjection && currentStage && (
            <ObjectionNavButtons script={script} currentStage={currentStage} onSelectStage={onSelectStage} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={TITLE_ID} className="text-[28px] font-bold text-primary-dark">
              {currentObjection?.label || currentStage?.label}
            </h2>
            {turns.some((turn) => turn.speaker === "operator") && (
              <CopyButton value={collectOperatorText(turns, clientName)} label={tCommon("copyAll")} />
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
            {t("nextStage", { stage: nextStage.label })}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </Dialog>
  );
}
