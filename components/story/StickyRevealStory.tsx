"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { m, useMotionValueEvent, useReducedMotion, useScroll, type Variants } from "framer-motion";
import {
  ABOUT_ILLUSTRATIONS,
  type AboutBeatId,
  type IllustrationDrawState,
} from "@/components/story/about-illustrations";
import { activeBeatIndex, BEAT_OFFSET, RAIL_OFFSET } from "@/components/story/sticky-reveal-geometry";
import { useMotionReady } from "@/hooks/useMotionReady";
import { useMounted } from "@/hooks/useMounted";
import { revealVariant, useRevealPhase } from "@/hooks/useRevealPhase";
import { distances, durations, easings, noTransition, tween } from "@/lib/motion/tokens";

export interface StickyRevealBeat {
  id: AboutBeatId;
  title: string;
  body: string;
}

interface StickyRevealStoryProps {
  /** The chapters in reading order; the finale is added after them. */
  beats: readonly StickyRevealBeat[];
  finaleCaption: string;
}

type LayerState = "shown" | "hidden";

// Crossfade of the card's layers. The incoming layer rises from `reveal`; the
// outgoing one only fades — faster, so two busy drawings barely overlap —
// then drops back to `reveal` unseen.
const LAYER_VARIANTS: Variants = {
  shown: { opacity: 1, y: 0, transition: tween(durations.base, easings.standard) },
  hidden: {
    opacity: 0,
    y: distances.reveal,
    transition: { opacity: tween(durations.instant, easings.exit), y: { duration: 0, delay: durations.instant } },
  },
};
const INSTANT_LAYER_VARIANTS: Variants = {
  shown: { opacity: 1, y: 0, transition: noTransition },
  hidden: { opacity: 0, y: 0, transition: noTransition },
};

const MARKER_VARIANTS: Variants = {
  shown: { scaleY: 1, opacity: 1, transition: tween(durations.base) },
  hidden: { scaleY: 0, opacity: 0, transition: tween(durations.base) },
};
const INSTANT_MARKER_VARIANTS: Variants = {
  shown: { scaleY: 1, opacity: 1, transition: noTransition },
  hidden: { scaleY: 0, opacity: 0, transition: noTransition },
};

/** A bit per beat that has been on the card; beat 0 is there from the start. */
const FIRST_BEAT_SEEN = 1;

/**
 * The /company/about scene (CLAUDE.md §14): a "sticky scroll reveal". ≥ lg the
 * chapters run down the left beside a progress rail, and a sticky card on the
 * right shows the active beat's illustration; the finale is the fifth beat.
 * Below lg there is no card: every chapter carries its own illustration,
 * drawn once as it scrolls in.
 *
 * The active beat is the breakpoint closest to the list's scroll progress
 * (activeBeatIndex). It is React state, but it changes at most once per beat
 * boundary — the scroll handler compares against a ref first. Until the
 * animation features are in, beat 0 stays active, as in the server HTML.
 *
 * Nothing here dims or hides text: the active chapter is marked by the rail's
 * accent marker and a class swap of its title colour (both AA on the card).
 * The server HTML, no-JS and reduced motion show every chapter at full
 * strength and the card with beat 0 fully drawn.
 */
export function StickyRevealStory({ beats, finaleCaption }: StickyRevealStoryProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const ready = useMotionReady();
  const mounted = useMounted();
  const count = beats.length + 1;
  const ids: readonly AboutBeatId[] = [...beats.map((beat) => beat.id), "finale"];

  const [view, setView] = useState({ active: 0, seen: FIRST_BEAT_SEEN });
  const activeRef = useRef(0);
  const readyRef = useRef(ready);

  const { scrollYProgress } = useScroll({ target: listRef, offset: BEAT_OFFSET });
  const { scrollYProgress: railProgress } = useScroll({ target: listRef, offset: RAIL_OFFSET });

  const follow = useCallback(
    (progress: number) => {
      const next = activeBeatIndex(progress, count);
      if (next === activeRef.current) return;
      activeRef.current = next;
      setView((current) => ({ active: next, seen: current.seen | (1 << next) }));
    },
    [count]
  );

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (readyRef.current) follow(latest);
  });
  // The page may open scrolled (a reload keeps the position): catch up once
  // the features are in.
  useEffect(() => {
    readyRef.current = ready;
    if (ready) follow(scrollYProgress.get());
  }, [ready, follow, scrollYProgress]);

  const { active, seen } = view;
  const layerVariants = reduce ? INSTANT_LAYER_VARIANTS : LAYER_VARIANTS;
  const markerVariants = reduce ? INSTANT_MARKER_VARIANTS : MARKER_VARIANTS;
  const state = (index: number): LayerState => (index === active ? "shown" : "hidden");

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div ref={listRef} className="relative space-y-6 lg:space-y-0 lg:pl-10">
        {beats.map((beat, index) => {
          const titleId = `${uid}-${beat.id}`;
          const isActive = index === active;
          return (
            <section
              key={beat.id}
              aria-labelledby={titleId}
              data-active={isActive ? "true" : "false"}
              className="relative lg:flex lg:min-h-[55vh] lg:items-center"
            >
              <Marker state={state(index)} variants={markerVariants} />
              <div className="w-full rounded-2xl border border-border bg-surface p-5 md:p-6">
                <InlineFigure id={beat.id} className="mb-4" />
                <h2
                  id={titleId}
                  className={`text-[18px] font-bold leading-7 ${
                    isActive ? "text-primary-dark" : "text-primary-dark lg:text-text-secondary"
                  }`}
                >
                  {beat.title}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{beat.body}</p>
              </div>
            </section>
          );
        })}

        {/* The finale: the last beat, and the run-out that lets it become active
            (70vh — FINALE_VH in sticky-reveal-geometry.ts). */}
        <div
          data-active={active === count - 1 ? "true" : "false"}
          className="relative pt-2 lg:flex lg:min-h-[70vh] lg:items-center lg:pt-0"
        >
          <Marker state={state(count - 1)} variants={markerVariants} />
          <div className="flex w-full flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <InlineFigure id="finale" />
            <p className="max-w-md text-[15px] font-semibold leading-relaxed text-primary-dark">{finaleCaption}</p>
          </div>
        </div>

        {/* Progress rail: the track, and the reader's progress over it. Last,
            so it takes no space-y margin away from the first chapter. */}
        <div aria-hidden="true" className="absolute inset-y-0 left-5 -ml-px hidden w-0.5 lg:block">
          <div className="absolute inset-0 rounded-full bg-border" />
          {/* The server renders the scroll-linked fill; switching to the full one
              only after mount keeps hydration in step with that HTML
              (useReducedMotion already answers on the first client render). */}
          {mounted && reduce ? (
            <div className="absolute inset-0 rounded-full bg-accent" />
          ) : (
            <m.div className="absolute inset-0 origin-top rounded-full bg-accent" style={{ scaleY: railProgress }} />
          )}
        </div>
      </div>

      {/* The card's cell spans the whole list, so the card stays pinned below
          the 56px TopBar from the first chapter to the finale. */}
      <div className="hidden lg:block">
        <div
          data-active-beat={active}
          className="sticky top-24 aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-alt"
        >
          {ids.map((id, index) => {
            // A layer exists once its beat has been active; beat 0 is the
            // server HTML's, already drawn. The others draw on first arrival.
            if ((seen & (1 << index)) === 0) return null;
            const Illustration = ABOUT_ILLUSTRATIONS[id];
            const drawn = index === 0 || reduce;
            return (
              <m.div
                key={id}
                data-beat-illustration="card"
                data-beat={index}
                className="absolute inset-0 p-4 xl:p-5"
                initial={index === 0 ? false : "hidden"}
                animate={state(index)}
                variants={layerVariants}
              >
                {drawn ? (
                  <Illustration className="block h-full w-full" />
                ) : (
                  <DrawOnce>
                    <Illustration draw="animate" className="block h-full w-full" />
                  </DrawOnce>
                )}
              </m.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The accent marker on the rail beside a beat (≥ lg). */
function Marker({ state, variants }: { state: LayerState; variants: Variants }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-10 hidden w-10 items-center justify-center lg:flex">
      <m.span
        className="block h-12 w-1 origin-center rounded-full bg-accent"
        initial={false}
        animate={state}
        variants={variants}
      />
    </span>
  );
}

/** Draws its illustration's main strokes once, on mount. */
function DrawOnce({ children }: { children: ReactNode }) {
  const initial: IllustrationDrawState = "undrawn";
  const animate: IllustrationDrawState = "drawn";
  return (
    <m.div className="h-full w-full" initial={initial} animate={animate}>
      {children}
    </m.div>
  );
}

/**
 * A chapter's own illustration below lg (the card replaces it at lg). It
 * ships drawn in the server HTML; one that starts below the fold is undrawn
 * after mount and draws once as it scrolls in (useRevealPhase).
 */
function InlineFigure({ id, className = "" }: { id: AboutBeatId; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useRevealPhase(ref, { amount: 0.5 });
  const Illustration = ABOUT_ILLUSTRATIONS[id];
  const target: IllustrationDrawState = revealVariant(phase) === "hidden" ? "undrawn" : "drawn";

  return (
    <m.div
      ref={ref}
      data-beat-illustration="inline"
      className={`mx-auto aspect-[4/3] w-full max-w-sm rounded-xl bg-surface-alt p-3 lg:hidden ${className}`}
      initial={false}
      animate={target}
    >
      <Illustration draw={phase === "static" ? "static" : "animate"} className="block h-full w-full" />
    </m.div>
  );
}
