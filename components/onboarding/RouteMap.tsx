"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, Flag, Lightbulb, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProgressRing } from "@/components/onboarding/ProgressRing";
import { RouteCheckpoint } from "@/components/onboarding/RouteCheckpoint";
import { RouteDayCard } from "@/components/onboarding/RouteDayCard";
import {
  connectorPath,
  connectors,
  journey,
  segmentDrawn,
  sideOf,
  type CheckpointState,
  type Connector,
} from "@/components/onboarding/route-geometry";
import { scheduleIdle } from "@/lib/idle";
import type { LocalizedOnboardingDay } from "@/lib/content/onboarding";

// The scroll layer is ~2 kB of scene code plus framer's scroll and spring
// machinery — none of it needed to read the program or tick a day off. It
// loads once the page is idle, and never under reduced motion, where the
// server-drawn route below already is the final state.
const RouteTrail = dynamic(() => import("@/components/onboarding/RouteTrail").then((mod) => mod.RouteTrail), {
  ssr: false,
});

export interface RouteDay extends LocalizedOnboardingDay {
  /** The day's line of the summary checklist; null when the day has none. */
  summary: string | null;
}

interface RouteMapProps {
  /** In day order. */
  days: readonly RouteDay[];
  /** Day numbers ticked off, in any order. */
  completedDays: readonly number[];
  onToggleDay: (day: number) => void;
  /** False until the reader's progress has loaded (and always without JS):
   * the route shows no position yet and the checkboxes wait. */
  ready: boolean;
}

/** Stroke widths, px (non-scaling): the dashed way ahead and the solid way travelled. */
const BASE_WIDTH = 2;
const DRAWN_WIDTH = 3;
const DASHES = "5 7";

/**
 * Where each segment's box sits in its row, per layout. A checkpoint's centre
 * is 14px (stacked: top of the label line) or 28px (alternating: middle of
 * the card header) below its row's top; rows are 24px apart (gap-6) and the
 * list has 24px above the first row (pt-6) and 40px below the last (pb-10),
 * where the finish sits 24px under it. So a leg runs from this checkpoint to
 * `gap + next checkpoint's offset` below the row, the lead-in from the list's
 * top to the first checkpoint, the run-out to the finish.
 */
const SEGMENT_CLASS = {
  stacked: { leadIn: "-top-6 h-[38px]", leg: "top-3.5 -bottom-[38px]", runOut: "top-3.5 -bottom-6" },
  alternating: { leadIn: "-top-6 h-[52px]", leg: "top-7 -bottom-[52px]", runOut: "top-7 -bottom-6" },
} as const;

/** Checkpoint and finish x inside the route column; alternating rows sit a quarter in from their card's side (ROUTE_X). */
const CHECKPOINT_X = { left: "md:left-1/4", right: "md:left-3/4" } as const;

/** True once `ready` has been true for a commit: the value the page opens
 * with is shown as it is, only later changes animate. */
function useSettled(ready: boolean): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (ready) setSettled(true);
  }, [ready]);
  return ready && settled;
}

/** Whether to mount the scroll layer: after the first idle period, and only
 * while the reader allows motion. */
function useTrailWanted(): boolean {
  const reduce = useReducedMotion();
  const [idle, setIdle] = useState(false);
  useEffect(() => scheduleIdle(() => setIdle(true)), []);
  return idle && !reduce;
}

function Segment({
  connector,
  role,
  layout,
  drawn,
}: {
  connector: Connector;
  role: "leadIn" | "leg" | "runOut";
  layout: "stacked" | "alternating";
  drawn: boolean;
}) {
  const d = connectorPath(connector);
  return (
    <div
      data-route-segment=""
      data-from={connector.from}
      data-to={connector.to}
      className={`absolute left-0 right-0 ${SEGMENT_CLASS[layout][role]} ${layout === "stacked" ? "md:hidden" : "hidden md:block"}`}
    >
      {/* A replaced element does not stretch between top and bottom by
          itself, so the box above sizes the svg. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <path
          d={d}
          fill="none"
          strokeWidth={BASE_WIDTH}
          strokeDasharray={DASHES}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-border"
        />
        {drawn && (
          <path
            data-route-drawn=""
            d={d}
            fill="none"
            strokeWidth={DRAWN_WIDTH}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-accent"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * "Marshrut" — the /company/onboarding scene (CLAUDE.md §14): the new hire's
 * four days as a route, drawn up to where they are. Presentation only:
 * OnboardingChecklist owns the progress, its storage and its telemetry.
 *
 * - Hero: a ring for the share done, "2/4 kun yakunlandi", and a plain
 *   anchor to the next day.
 * - Route: from md up the day cards alternate left/right and the line sways
 *   between them in a gentle S; below md it is one straight line on the left.
 *   One checkpoint per day: filled when done, a ring where the reader is,
 *   hollow ahead.
 *
 * The server HTML carries the whole route: every segment is a small svg in
 * its row, dashed, and solid up to the reader's position — the final state
 * that reduced motion, no-JS and the first paint all show. Once the page is
 * idle, RouteTrail (lazy) takes over the solid line and draws it with scroll.
 * Text is never animated; the DOM is in reading order.
 */
export function RouteMap({ days, completedDays, onToggleDay, ready }: RouteMapProps) {
  const t = useTranslations("pages.company.onboarding");
  const heroId = useId();
  const routeRef = useRef<HTMLDivElement>(null);
  const [openDay, setOpenDay] = useState<number | null>(1);
  const [trailActive, setTrailActive] = useState(false);
  const animateChanges = useSettled(ready);
  const trailWanted = useTrailWanted();

  const progress = ready ? journey(days.map((day) => day.day), completedDays) : null;
  // Before the progress is known only the lead-in is drawn: no position is claimed.
  const reached = progress?.reached ?? 1;
  const total = days.length;
  const currentIndex = progress?.current ?? null;
  const nextDay = currentIndex === null ? null : days[currentIndex];
  const finished = progress !== null && currentIndex === null;
  const lastIndex = days.length - 1;

  const stackedConnectors = connectors(days.length, "stacked");
  const alternatingConnectors = connectors(days.length, "alternating");

  const statusLabel = (state: CheckpointState | null): string | null => {
    if (state === "current") return t("route.youAreHere");
    if (state === "done") return t("route.done");
    if (state === "upcoming") return t("route.upcoming");
    return null;
  };

  const segments = (index: number) => {
    // Segment 0 is the lead-in; the one leaving checkpoint `index` is index + 1.
    const roles: { segment: number; role: "leadIn" | "leg" | "runOut" }[] = [
      ...(index === 0 ? [{ segment: 0, role: "leadIn" as const }] : []),
      { segment: index + 1, role: index === lastIndex ? "runOut" : "leg" },
    ];
    return roles.flatMap(({ segment, role }) => {
      const drawn = segmentDrawn(segment, reached) && !trailActive;
      return [
        <Segment key={`s-${segment}`} connector={stackedConnectors[segment]} role={role} layout="stacked" drawn={drawn} />,
        <Segment
          key={`a-${segment}`}
          connector={alternatingConnectors[segment]}
          role={role}
          layout="alternating"
          drawn={drawn}
        />,
      ];
    });
  };

  return (
    <div className="space-y-2">
      <section aria-labelledby={heroId} className="rounded-2xl border border-border bg-surface p-5 shadow-soft md:p-6">
        <div className="flex items-center gap-4 md:gap-5">
          <ProgressRing
            value={progress && total > 0 ? progress.done / total : 0}
            animateChanges={animateChanges}
            className="h-16 w-16 md:h-20 md:w-20"
          >
            <Route size={22} aria-hidden="true" className="text-accent" />
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 id={heroId} className="text-[20px] font-bold leading-tight text-primary-dark">
              {t("route.title")}
            </h2>
            {progress ? (
              <>
                <p className="mt-1 text-[15px] font-semibold leading-6 tabular-nums text-accent">
                  {t("route.progress", { done: progress.done, total })}
                </p>
                {nextDay ? (
                  <p className="text-[14px] font-medium leading-6">
                    <a
                      href={`#day-${nextDay.day}`}
                      // Opens the day it points to; the jump itself is the browser's own.
                      onClick={() => setOpenDay(nextDay.day)}
                      className="rounded-lg text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {t("route.next", { day: nextDay.day, title: nextDay.title })}
                      <ArrowDown size={14} aria-hidden="true" className="ml-1 inline-block align-[-2px]" />
                    </a>
                  </p>
                ) : (
                  <p className="text-[14px] font-medium leading-6 text-text-secondary">{t("route.finished")}</p>
                )}
              </>
            ) : (
              <>
                <span className="mt-1 block h-6 w-44 animate-pulse rounded-lg bg-surface-alt" />
                <span className="block h-6 w-56 max-w-full animate-pulse rounded-lg bg-surface-alt" />
              </>
            )}
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2.5 border-t border-border pt-4 text-[14px] leading-relaxed text-text-secondary">
          <Lightbulb size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          <span>
            <strong className="text-primary-dark">{t("welcomeTitle")}</strong> {t("welcomeBody", { days: total })}
          </span>
        </p>
      </section>

      <div ref={routeRef} className="relative">
        <ol aria-label={t("route.label")} className="flex flex-col gap-6 pb-10 pt-6">
          {days.map((day, index) => {
            const side = sideOf(index);
            const state = progress?.states[index] ?? null;
            const label = statusLabel(state);
            return (
              <li
                key={day.day}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] md:gap-0"
              >
                <div aria-hidden="true" className="relative col-start-1 row-span-2 row-start-1 md:col-start-2 md:row-span-1">
                  {segments(index)}
                  <RouteCheckpoint
                    state={state}
                    animateChanges={animateChanges}
                    className={`absolute left-1/2 top-0 -translate-x-1/2 md:top-3.5 ${CHECKPOINT_X[side]}`}
                  />
                  {index === lastIndex && (
                    <span
                      data-route-finish=""
                      className={`absolute -bottom-6 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 ${
                        finished ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-text-secondary"
                      } ${CHECKPOINT_X[side]}`}
                    >
                      <Flag size={12} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <p
                  className={`col-start-2 row-start-1 flex h-7 items-center md:row-start-1 md:mt-3.5 md:px-4 ${
                    side === "left" ? "md:col-start-3" : "md:col-start-1 md:justify-end"
                  }`}
                >
                  {state === "current" ? (
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[12px] font-semibold text-accent">{label}</span>
                  ) : (
                    label && <span className="text-[12px] font-medium text-text-secondary">{label}</span>
                  )}
                </p>
                <div className={`col-start-2 row-start-2 md:row-start-1 ${side === "left" ? "md:col-start-1" : "md:col-start-3"}`}>
                  <RouteDayCard
                    day={day}
                    summary={day.summary}
                    open={openDay === day.day}
                    onToggleOpen={() => setOpenDay(openDay === day.day ? null : day.day)}
                    done={state === "done"}
                    ready={ready}
                    onToggleDone={() => onToggleDay(day.day)}
                  />
                </div>
              </li>
            );
          })}
        </ol>
        {trailWanted && <RouteTrail routeRef={routeRef} reached={reached} ready={ready} onActive={setTrailActive} />}
      </div>
    </div>
  );
}
