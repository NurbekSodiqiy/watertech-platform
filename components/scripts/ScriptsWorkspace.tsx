"use client";

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import type { Stage, Objection, ScriptTurn } from "@/lib/content/types";
import type { ContentBundle } from "@/lib/content/loader";
import { ScriptsContentProvider, useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { objectionToTurns } from "@/components/ScriptTurns";
import { ClientNameProvider } from "@/components/ClientNameContext";
import { ClientNameInput } from "@/components/ClientNameInput";
import { ObjectionChipRow } from "@/components/ObjectionChipRow";
import { CallModeOverlay } from "@/components/CallModeOverlay";
import { FaqTab } from "@/components/FaqTab";
import { PackagesTab } from "@/components/PackagesTab";
import { CompetitorsTab } from "@/components/CompetitorsTab";
import { SalesScriptsTab } from "@/components/SalesScriptsTab";
import { useTrack } from "@/hooks/useTrack";

// Last opened script/stage — restored on mount from the URL (?script=&stage=)
// if present, else from localStorage, so an F5 reload or the browser's back
// button drops the operator back where they were instead of the first stage
// of the first script every time.
const STORAGE_SCRIPT_KEY = "watertech-scripts-last-script";
const STORAGE_STAGE_KEY = "watertech-scripts-last-stage";

type ScriptsTab = "faq" | "packages" | "competitors" | "sales_scripts";

type UrlStatePatch = { script?: string; stage?: string | null; objection?: string | null; tab?: string | null };

export function ScriptsWorkspace({ content }: { content: ContentBundle }) {
  return (
    <ScriptsContentProvider value={content}>
      <ClientNameProvider>
        <Suspense fallback={null}>
          <ScriptsPageContent />
        </Suspense>
      </ClientNameProvider>
    </ScriptsContentProvider>
  );
}

function ScriptsPageContent() {
  const { scripts, objections } = useScriptsContent();
  const searchParams = useSearchParams();
  const scriptParam = searchParams.get("script");
  const stageParam = searchParams.get("stage");
  const objectionParam = searchParams.get("objection");
  const tabParam = searchParams.get("tab");

  const activeTab: ScriptsTab =
    tabParam === "faq" || tabParam === "packages" || tabParam === "competitors" ? tabParam : "sales_scripts";

  const activeSalesScript = (scriptParam && scripts.find((s) => s.id === scriptParam)) || scripts[0];

  const selectedScriptStage: Stage | null = stageParam
    ? activeSalesScript.stages.find((s) => s.id === stageParam) ?? null
    : null;

  const selectedObjection: Objection | null = (() => {
    if (!objectionParam) return null;
    const objection = objections.find((o) => o.id === objectionParam);
    if (!objection) return null;
    const belongsToActiveScript = activeSalesScript.stages.some((s) => s.objectionIds.includes(objection.id));
    return belongsToActiveScript ? objection : null;
  })();

  const [callModeOn, setCallModeOn] = useState(false);

  // The one function used both to navigate to a new script/stage/objection/
  // tab and to restore a saved position — never `router.push` here (that
  // would trigger a server RSC fetch for a same-route search-param change,
  // see CLAUDE.md section 4). `pushState`/`replaceState` on the same route
  // keep `useSearchParams()` in sync on their own (Next >=14.1).
  const setUrlState = useCallback(
    (next: UrlStatePatch, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(searchParams.toString());
      (Object.entries(next) as [string, string | null | undefined][]).forEach(([key, value]) => {
        if (value === null) params.delete(key);
        else if (value !== undefined) params.set(key, value);
      });
      const url = `/sales-process/scripts?${params.toString()}`;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [searchParams]
  );

  // Telemetry — one small effect per "thing being viewed" instead of a
  // track() call duplicated at every place each piece of state can change
  // (direct click, keyboard shortcut, objection nav buttons, URL restore).
  const track = useTrack();
  useEffect(() => {
    track("script_select", { entityType: "script", entityId: activeSalesScript.id });
  }, [activeSalesScript.id, track]);
  useEffect(() => {
    if (selectedScriptStage) track("stage_view", { entityType: "stage", entityId: selectedScriptStage.id });
  }, [selectedScriptStage, track]);
  useEffect(() => {
    if (selectedObjection) track("objection_view", { entityType: "objection", entityId: selectedObjection.id });
  }, [selectedObjection, track]);
  // Skips the mount-time run — callModeOn starts false, and that isn't a
  // real "left Call Mode" event, just the initial value.
  const isFirstCallModeRender = useRef(true);
  useEffect(() => {
    if (isFirstCallModeRender.current) {
      isFirstCallModeRender.current = false;
      return;
    }
    track(callModeOn ? "call_mode_on" : "call_mode_off");
  }, [callModeOn, track]);

  // Fallback restore from localStorage — only when the URL didn't already
  // specify a position (e.g. the operator navigated here fresh from the
  // sidebar rather than reloading/returning to a specific stage's link).
  // Mount-only: a `replace` so it doesn't create an extra history entry.
  useEffect(() => {
    if (scriptParam) return;
    try {
      const savedScriptId = localStorage.getItem(STORAGE_SCRIPT_KEY);
      const savedStageId = localStorage.getItem(STORAGE_STAGE_KEY);
      const script = savedScriptId ? scripts.find((s) => s.id === savedScriptId) : undefined;
      if (!script) return;
      const stage = savedStageId ? script.stages.find((s) => s.id === savedStageId) : undefined;
      setUrlState({ script: script.id, stage: stage?.id ?? null }, "replace");
    } catch {
      // localStorage unavailable — position just won't be restored
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep localStorage in sync with the current script/stage whenever the
  // operator is on the scripts tab, so a later fresh visit (no URL params
  // yet) lands back in the same place. No URL work here — the URL is
  // already authoritative and kept up to date by setUrlState.
  useEffect(() => {
    if (activeTab !== "sales_scripts") return;
    try {
      localStorage.setItem(STORAGE_SCRIPT_KEY, activeSalesScript.id);
      if (selectedScriptStage) localStorage.setItem(STORAGE_STAGE_KEY, selectedScriptStage.id);
      else localStorage.removeItem(STORAGE_STAGE_KEY);
    } catch {
      // localStorage unavailable — position just won't persist
    }
  }, [activeTab, activeSalesScript.id, selectedScriptStage]);

  // The left ("TV screen") panel scrolls internally now instead of the
  // whole window — resetting it to the top on selection change no longer
  // yanks the operator away from wherever they were reading on the page.
  const leftPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [activeTab, activeSalesScript, selectedScriptStage, selectedObjection]);

  // Stable reference for ScriptTurnList's memo to actually bail on —
  // objectionToTurns(...) builds a fresh array every call otherwise.
  const currentTurns: ScriptTurn[] | null = useMemo(() => {
    if (selectedObjection) return objectionToTurns(selectedObjection);
    return selectedScriptStage?.turns ?? null;
  }, [selectedObjection, selectedScriptStage]);

  // The one function that actually opens Call Mode — F2 and the on-screen
  // "Qo'ng'iroq rejimi" button both call this rather than each having their
  // own copy. "Call Mode" with nothing selected isn't meaningful, so it's a
  // no-op until a stage/objection is open.
  const openCallMode = useCallback(() => {
    if (selectedScriptStage || selectedObjection) setCallModeOn(true);
  }, [selectedScriptStage, selectedObjection]);

  const selectScript = useCallback(
    (id: string) => setUrlState({ script: id, stage: null, objection: null }),
    [setUrlState]
  );

  // Shared by ObjectionNavButtons (back/forward out of an objection) and
  // Call Mode's "Keyingi bosqich" button — picking a stage always leaves
  // any objection view.
  const handleSelectStage = useCallback(
    (stage: Stage) => setUrlState({ stage: stage.id, objection: null }),
    [setUrlState]
  );

  // Used by the always-visible objection chip row — jumps straight to an
  // objection's response from anywhere, one click, no accordion digging.
  const selectObjection = useCallback(
    (o: Objection) => {
      const stage = activeSalesScript.stages.find((s) => s.objectionIds.includes(o.id));
      setUrlState({ tab: null, stage: stage?.id ?? null, objection: o.id });
    },
    [activeSalesScript, setUrlState]
  );

  function handleTabClick(tab: ScriptsTab) {
    if (tab === "sales_scripts") setUrlState({ tab: null, stage: null, objection: null }, "replace");
    else setUrlState({ tab }, "replace");
  }

  // Keyboard shortcuts — never while the operator is typing somewhere
  // (client-name field, the competitor search box, CommandPalette's own
  // input). `/` works across all tabs of this page; 1-6/arrows/Esc stay
  // scoped to the sales_scripts tab only.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      // Opens the existing sitewide CommandPalette rather than a new local
      // search box — dispatching the same synthetic Ctrl+K keydown its own
      // listener (in AppShell.tsx) already reacts to, instead of adding a
      // second copy of that open/close state here.
      if (e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
        return;
      }

      if (activeTab !== "sales_scripts") return;

      // Closing (when already on) just turns it off; opening goes through
      // the same openCallMode() the on-screen button uses.
      if (e.key === "F2") {
        e.preventDefault();
        if (callModeOn) setCallModeOn(false);
        else openCallMode();
        return;
      }

      if (e.key >= "1" && e.key <= "6") {
        const stage = activeSalesScript.stages[Number(e.key) - 1];
        if (stage) handleSelectStage(stage);
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const stages = activeSalesScript.stages;
        const currentIndex = selectedScriptStage ? stages.findIndex((s) => s.id === selectedScriptStage.id) : -1;
        const nextIndex =
          e.key === "ArrowRight"
            ? Math.min(currentIndex < 0 ? 0 : currentIndex + 1, stages.length - 1)
            : Math.max(currentIndex < 0 ? 0 : currentIndex - 1, 0);
        const stage = stages[nextIndex];
        if (stage) {
          e.preventDefault();
          handleSelectStage(stage);
        }
        return;
      }

      if (e.key === "Escape") {
        if (callModeOn) {
          setCallModeOn(false);
        } else if (selectedObjection || selectedScriptStage) {
          setUrlState({ stage: null, objection: null });
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, activeSalesScript, selectedScriptStage, selectedObjection, callModeOn, openCallMode, handleSelectStage, setUrlState]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Jonli skriptlar va Yordamchi</h1>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-border border-l-[3px] border-l-primary bg-primary-light/10 px-4 py-3">
          <Compass size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-text-secondary">
            Maqsadimiz naxt savdoga ko&apos;proq urg&apos;u berish, eng so&apos;ngi chora nasiya bo&apos;lishi kerak. Mijoz naxt berishga puli yo&apos;q emas, aynan bizga berishga puli yo&apos;q deb qabul qilishimiz kerak.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap w-fit shrink-0 items-center gap-0.5 rounded-[20px] border border-border bg-surface-alt p-1">
          <button
            onClick={() => handleTabClick("sales_scripts")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "sales_scripts" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Sotuv skriptlari
          </button>
          <button
            onClick={() => handleTabClick("packages")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "packages" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Hamkorlik paketlari
          </button>
          <button
            onClick={() => handleTabClick("competitors")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "competitors" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Raqobatchilar
          </button>
          <button
            onClick={() => handleTabClick("faq")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "faq" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            FAQ savollar
          </button>
        </div>

        <ClientNameInput />
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {activeTab === "faq" ? (
          <FaqTab leftPanelRef={leftPanelRef} />
        ) : activeTab === "packages" ? (
          <PackagesTab leftPanelRef={leftPanelRef} />
        ) : activeTab === "competitors" ? (
          <CompetitorsTab leftPanelRef={leftPanelRef} />
        ) : (
          <SalesScriptsTab
            leftPanelRef={leftPanelRef}
            activeSalesScript={activeSalesScript}
            selectedScriptStage={selectedScriptStage}
            selectedObjection={selectedObjection}
            currentTurns={currentTurns}
            onSelectScript={selectScript}
            onSelectStage={handleSelectStage}
            onSelectObjection={selectObjection}
            onOpenCallMode={openCallMode}
          />
        )}

        {/* Always-visible e'tirozlar chip row — one click during a live call,
            no accordion to open first. Sits directly under the left panel.
            Placed after both panels in DOM order so the 12-col grid's
            default (sparse) auto-placement fills row 1 with the left+right
            panels first, then wraps this col-span-8 row to row 2 — placing
            it between them instead pushed the right panel into row 2 on its
            own, where its sticky/max-height styling made it look like a
            floating card stuck in the bottom-right corner. */}
        {activeTab === "sales_scripts" && (
          <div className="col-span-12 md:col-span-8">
            <ObjectionChipRow
              objections={objections}
              selectedObjectionId={selectedObjection?.id}
              onSelect={selectObjection}
            />
          </div>
        )}
      </div>

      {callModeOn && (selectedScriptStage || selectedObjection) && currentTurns && (
        <CallModeOverlay
          script={activeSalesScript}
          currentStage={selectedScriptStage}
          currentObjection={selectedObjection}
          turns={currentTurns}
          objections={objections}
          onSelectStage={handleSelectStage}
          onSelectObjection={selectObjection}
          onClose={() => setCallModeOn(false)}
        />
      )}
    </div>
  );
}
