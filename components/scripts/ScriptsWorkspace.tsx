"use client";

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { m, useReducedMotion } from "framer-motion";
import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Stage, Objection, ScriptTurn } from "@/lib/content/types";
import type { ContentBundle } from "@/lib/content/loader";
import { ScriptsContentProvider, useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { objectionToTurns } from "@/components/ScriptTurns";
import { ClientNameProvider } from "@/components/ClientNameContext";
import { ClientNameInput } from "@/components/ClientNameInput";
import { ObjectionChipRow } from "@/components/ObjectionChipRow";
import { FaqTab } from "@/components/FaqTab";
import { PackagesTab } from "@/components/PackagesTab";
import { CompetitorsTab } from "@/components/CompetitorsTab";
import { SalesScriptsTab } from "@/components/SalesScriptsTab";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useTrack } from "@/hooks/useTrack";
import { useUserState } from "@/hooks/useUserState";
import { useRecordRecent } from "@/hooks/useRecordRecent";
import { scriptsPositionKey } from "@/lib/user-state/keys";
import { noTransition, springs } from "@/lib/motion/tokens";
import { scheduleIdle } from "@/lib/idle";

// Only mounted once Call Mode is switched on; it is also what pulls the fuse.js search
// index into this route, so it stays out of the first-load chunk (CLAUDE.md #3).
const CallModeOverlay = dynamic(() => import("@/components/CallModeOverlay").then((m) => m.CallModeOverlay), {
  ssr: false,
});

/** Sliding active tab, same pattern as Sidebar's ActivePill. */
function TabPill() {
  const reduce = useReducedMotion();
  return (
    <m.span
      layoutId="scripts-tab-pill"
      className="absolute inset-0 rounded-full bg-primary shadow-softer"
      transition={reduce ? noTransition : springs.snappy}
      aria-hidden
    />
  );
}

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
  const { scripts } = useScriptsContent();
  const { user } = useSessionUser();
  const t = useTranslations("emptyState.scriptsNone");

  if (scripts.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <EmptyState
          icon={EMPTY_STATES.scriptsNone.icon}
          title={t("title")}
          reason={t("reason")}
          action={
            // Only the admin can open the editor — for an operator or a sales
            // manager, middleware would bounce /admin straight back home.
            user?.role === "admin"
              ? { label: t("ctaAdmin"), href: "/admin/scripts/new" }
              : { label: t("cta"), href: "/" }
          }
        />
      </div>
    );
  }

  return <ScriptsPageContentBody />;
}

/** Split out from ScriptsPageContent so the "no scripts published yet" guard
 * above can bail before any of this runs — activeSalesScript below assumes
 * scripts[0] exists. */
function ScriptsPageContentBody() {
  const tS = useTranslations("scripts");
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
  // Recents (home page, palette): the objection when one is showing, otherwise
  // the script — but only once the URL names it. A bare visit falls back to
  // scripts[0] without the operator having chosen anything. One target, not
  // two: two recordings in one commit would each start from the same stale list.
  useRecordRecent(
    activeTab !== "sales_scripts"
      ? null
      : selectedObjection
        ? { kind: "objection", id: selectedObjection.id }
        : scriptParam === activeSalesScript.id
          ? { kind: "script", id: activeSalesScript.id }
          : null
  );
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

  // Warms the chunk once the page is idle so switching Call Mode on mid-call is instant.
  useEffect(() => {
    return scheduleIdle(() => {
      void import("@/components/CallModeOverlay");
    });
  }, []);

  // Last opened script/stage, now per user rather than per browser: an
  // operator who starts on the office desktop and continues on a laptop lands
  // in the same place. The old `watertech-scripts-last-*` localStorage values
  // are imported once on first run.
  const [savedPosition, setSavedPosition, positionStatus] = useUserState(
    scriptsPositionKey.key,
    scriptsPositionKey.schema,
    scriptsPositionKey.defaultValue,
    scriptsPositionKey
  );

  // Fallback restore — only when the URL didn't already specify a position
  // (e.g. the operator navigated here fresh from the sidebar rather than
  // reloading/returning to a specific stage's link). The URL still wins, and
  // the restore happens exactly once: the ref guard keeps a server value that
  // arrives a moment later from yanking the operator somewhere else mid-read.
  // A `replace`, so it doesn't create an extra history entry.
  const restoredPosition = useRef(false);
  // The position the restore just put in the URL — the sync effect below
  // waits for the URL to actually carry it before it starts saving again.
  const awaitingUrl = useRef<{ scriptId: string; stageId: string | null } | null>(null);
  useEffect(() => {
    if (restoredPosition.current) return;
    if (scriptParam) {
      restoredPosition.current = true;
      return;
    }
    if (positionStatus === "loading") return;
    restoredPosition.current = true;
    if (!savedPosition) return;
    const script = scripts.find((s) => s.id === savedPosition.scriptId);
    if (!script) return;
    const stage = savedPosition.stageId ? script.stages.find((s) => s.id === savedPosition.stageId) : undefined;
    awaitingUrl.current = { scriptId: script.id, stageId: stage?.id ?? null };
    setUrlState({ script: script.id, stage: stage?.id ?? null }, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionStatus, savedPosition, scriptParam]);

  // Keep the saved position in sync with the current script/stage whenever
  // the operator is on the scripts tab, so a later fresh visit (no URL params
  // yet) lands back in the same place. No URL work here — the URL is already
  // authoritative and kept up to date by setUrlState. Writing only on an
  // actual change keeps the debounced storage/network work off unrelated
  // renders.
  useEffect(() => {
    if (activeTab !== "sales_scripts") return;
    // Never before the restore above has had its turn — on a fresh visit the
    // first render already has scripts[0] selected, and writing that would
    // erase the position being restored.
    if (!restoredPosition.current) return;
    const stageId = selectedScriptStage?.id ?? null;
    if (awaitingUrl.current) {
      if (awaitingUrl.current.scriptId !== activeSalesScript.id || awaitingUrl.current.stageId !== stageId) return;
      awaitingUrl.current = null;
    }
    if (savedPosition?.scriptId === activeSalesScript.id && savedPosition.stageId === stageId) return;
    setSavedPosition({ scriptId: activeSalesScript.id, stageId });
  }, [activeTab, activeSalesScript.id, selectedScriptStage, savedPosition, setSavedPosition]);

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
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">{tS("title")}</h1>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-border border-l-[3px] border-l-primary bg-primary-light/10 px-4 py-3">
          <Compass size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-text-secondary">
            {tS("intro")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap w-fit shrink-0 items-center gap-0.5 rounded-[20px] border border-border bg-surface-alt p-1">
          <button
            onClick={() => handleTabClick("sales_scripts")}
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "sales_scripts" ? "text-surface" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {activeTab === "sales_scripts" && <TabPill />}
            <span className="relative">{tS("tabs.sales")}</span>
          </button>
          <button
            onClick={() => handleTabClick("packages")}
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "packages" ? "text-surface" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {activeTab === "packages" && <TabPill />}
            <span className="relative">{tS("tabs.packages")}</span>
          </button>
          <button
            onClick={() => handleTabClick("competitors")}
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "competitors" ? "text-surface" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {activeTab === "competitors" && <TabPill />}
            <span className="relative">{tS("tabs.competitors")}</span>
          </button>
          <button
            onClick={() => handleTabClick("faq")}
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "faq" ? "text-surface" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {activeTab === "faq" && <TabPill />}
            <span className="relative">{tS("tabs.faq")}</span>
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
