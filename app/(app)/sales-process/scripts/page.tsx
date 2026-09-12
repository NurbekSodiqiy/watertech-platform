"use client";

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import type { Stage, Objection, ScriptTurn } from "@/lib/content/types";
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

export default function ScriptsPage() {
  return (
    <Suspense fallback={null}>
      <ScriptsPageContent />
    </Suspense>
  );
}

function ScriptsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlScriptId = searchParams.get("script");
  const urlStageId = searchParams.get("stage");

  const [activeTab, setActiveTab] = useState<"faq" | "packages" | "competitors" | "sales_scripts">("sales_scripts");

  // Sotuv skriptlari state — initial value comes straight from the URL query
  // when present (identical on server and client, so this is hydration-safe
  // unlike reading localStorage during render).
  const [activeSalesScriptId, setActiveSalesScriptId] = useState<string>(() =>
    urlScriptId && scripts.some((s) => s.id === urlScriptId) ? urlScriptId : scripts[0].id
  );
  const activeSalesScript = scripts.find((s) => s.id === activeSalesScriptId) || scripts[0];
  const [selectedScriptStage, setSelectedScriptStage] = useState<Stage | null>(() => {
    if (!urlScriptId || !urlStageId) return null;
    const script = scripts.find((s) => s.id === urlScriptId);
    return script?.stages.find((s) => s.id === urlStageId) ?? null;
  });
  const [expandedScriptStageId, setExpandedScriptStageId] = useState<string | null>(null);
  const [selectedObjection, setSelectedObjection] = useState<Objection | null>(null);
  const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);
  const [callModeOn, setCallModeOn] = useState(false);

  // Set right before a URL->state sync below writes state, so the
  // state->URL push effect (further down) can tell "this state change came
  // from Back/Forward" apart from "the operator just clicked something" and
  // skip re-pushing the same URL it just read.
  const isSyncingFromUrl = useRef(false);

  // Telemetry — one small effect per "thing being viewed" instead of a
  // track() call duplicated at every place each piece of state can change
  // (direct click, keyboard shortcut, objection nav buttons, URL restore).
  const track = useTrack();
  useEffect(() => {
    track("script_select", { entityType: "script", entityId: activeSalesScriptId });
  }, [activeSalesScriptId, track]);
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
  useEffect(() => {
    if (urlScriptId) return;
    try {
      const savedScriptId = localStorage.getItem(STORAGE_SCRIPT_KEY);
      const savedStageId = localStorage.getItem(STORAGE_STAGE_KEY);
      const script = savedScriptId ? scripts.find((s) => s.id === savedScriptId) : undefined;
      if (!script) return;
      setActiveSalesScriptId(script.id);
      setSelectedScriptStage(savedStageId ? script.stages.find((s) => s.id === savedStageId) ?? null : null);
    } catch {
      // localStorage unavailable — position just won't be restored
    }
    // Restoring is a one-time, mount-only concern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-derive script/stage state when the URL changes out from under us —
  // i.e. the operator pressed Back/Forward. Without this, pushing a new
  // history entry per stage (below) would change the address bar on Back
  // but leave the visible stage exactly as it was, since state only ever
  // read the URL once, at mount.
  useEffect(() => {
    const script = urlScriptId ? scripts.find((s) => s.id === urlScriptId) : undefined;
    if (!script) return;
    const stage = urlStageId ? script.stages.find((s) => s.id === urlStageId) ?? null : null;
    const unchanged = script.id === activeSalesScriptId && (stage?.id ?? null) === (selectedScriptStage?.id ?? null);
    if (unchanged) return;
    isSyncingFromUrl.current = true;
    setActiveSalesScriptId(script.id);
    setSelectedScriptStage(stage);
    setSelectedObjection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlScriptId, urlStageId]);

  // Keep the URL and localStorage in sync with the current script/stage
  // whenever the operator is on the scripts tab, so both a reload and a
  // later visit land back in the same place. `push` (not `replace`) is
  // deliberate — each script/stage change gets its own history entry so the
  // browser's Back button steps back through them one at a time. Skipped
  // when the change just came FROM the URL (the effect above) so pressing
  // Back doesn't immediately push a duplicate forward entry.
  useEffect(() => {
    if (activeTab !== "sales_scripts") return;
    if (isSyncingFromUrl.current) {
      isSyncingFromUrl.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_SCRIPT_KEY, activeSalesScriptId);
      if (selectedScriptStage) localStorage.setItem(STORAGE_STAGE_KEY, selectedScriptStage.id);
      else localStorage.removeItem(STORAGE_STAGE_KEY);
    } catch {
      // localStorage unavailable — position just won't persist
    }
    const params = new URLSearchParams();
    params.set("script", activeSalesScriptId);
    if (selectedScriptStage) params.set("stage", selectedScriptStage.id);
    router.push(`/sales-process/scripts?${params.toString()}`, { scroll: false });
  }, [activeTab, activeSalesScriptId, selectedScriptStage, router]);

  // The left ("TV screen") panel scrolls internally now instead of the
  // whole window — resetting it to the top on selection change no longer
  // yanks the operator away from wherever they were reading on the page.
  const leftPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [activeTab, activeSalesScriptId, selectedScriptStage, selectedObjection]);

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
        if (stage) {
          setSelectedObjection(null);
          setSelectedScriptStage(stage);
          setExpandedScriptStageId(null);
        }
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
          setSelectedObjection(null);
          setSelectedScriptStage(stage);
          setExpandedScriptStageId(null);
        }
        return;
      }

      if (e.key === "Escape") {
        if (callModeOn) {
          setCallModeOn(false);
        } else if (selectedObjection || selectedScriptStage) {
          setSelectedObjection(null);
          setSelectedScriptStage(null);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, activeSalesScript, selectedScriptStage, selectedObjection, callModeOn, openCallMode]);

  // Used by the always-visible objection chip row — jumps straight to an
  // objection's response from anywhere, one click, no accordion digging.
  const selectObjection = (o: Objection) => {
    setActiveTab("sales_scripts");
    setSelectedObjection(o);
    const stage = activeSalesScript.stages.find((s) => s.objectionIds.includes(o.id));
    if (stage) setSelectedScriptStage(stage);
  };

  // Shared by ObjectionNavButtons (back/forward out of an objection) and
  // Call Mode's "Keyingi bosqich" button — picking a stage always leaves
  // any objection view.
  const handleSelectStage = (stage: Stage) => {
    setSelectedObjection(null);
    setSelectedScriptStage(stage);
  };

  return (
    <ClientNameProvider>
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
            onClick={() => {
              setActiveTab("sales_scripts");
              setSelectedScriptStage(null);
              setSelectedObjection(null);
              setExpandedScriptStageId(null);
            }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "sales_scripts" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Sotuv skriptlari
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "packages" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Hamkorlik paketlari
          </button>
          <button
            onClick={() => setActiveTab("competitors")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "competitors" ? "bg-primary text-surface shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Raqobatchilar
          </button>
          <button
            onClick={() => setActiveTab("faq")}
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
            activeSalesScriptId={activeSalesScriptId}
            selectedScriptStage={selectedScriptStage}
            selectedObjection={selectedObjection}
            expandedScriptStageId={expandedScriptStageId}
            isScriptDropdownOpen={isScriptDropdownOpen}
            currentTurns={currentTurns}
            setActiveSalesScriptId={setActiveSalesScriptId}
            setSelectedScriptStage={setSelectedScriptStage}
            setSelectedObjection={setSelectedObjection}
            setExpandedScriptStageId={setExpandedScriptStageId}
            setIsScriptDropdownOpen={setIsScriptDropdownOpen}
            onSelectStage={handleSelectStage}
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
    </ClientNameProvider>
  );
}
