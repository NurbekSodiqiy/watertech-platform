"use client";

import { useId, useMemo, useRef, type ReactNode, type Ref } from "react";
import { m, useReducedMotion, useTransform, type MotionValue, type Variants } from "framer-motion";
import { DrawPath } from "@/components/motion/DrawPath";
import {
  boreRadius,
  LABEL_FONT_SIZE,
  labelArcPath,
  LAYERS_VIEWBOX,
  RING_WIDTH,
  ringBandOpacity,
  ringDrawn,
  ringLabelOpacity,
  ringPath,
  ringRadius,
  ringSettle,
  SETTLED_OPACITY,
  WAVE_STROKE,
  waterFill,
  waveDrawn,
  wavePath,
} from "@/components/story/layers-geometry";
import { useMotionReady } from "@/hooks/useMotionReady";
import { useMounted } from "@/hooks/useMounted";
import { revealVariant, useRevealPhase } from "@/hooks/useRevealPhase";
import { durations, noTransition, tween } from "@/lib/motion/tokens";

export interface LayersRing {
  id: string;
  /** Short word printed on the ring (desktop figure only). */
  label: string;
  /** The chapter's beat, 0 → 1 (see useScrollBeat). */
  beat: MotionValue<number>;
}

/**
 * - `scroll`: the sticky desktop figure. Rings follow their chapters' beats,
 *   the water follows the finale beat.
 * - `reveal`: a small static figure (mobile). It draws once, when it first
 *   scrolls into view: ring `active` if there is one, otherwise the water.
 */
type LayersCrossSectionProps =
  | { mode: "scroll"; rings: readonly LayersRing[]; finale: MotionValue<number>; className?: string }
  | {
      mode: "reveal";
      count: number;
      /** The ring this figure adds: rings before it are settled, rings after
       * it are bare track. `null`: every ring is settled (the finale). */
      active: number | null;
      /** Water in the bore (the finale). */
      water: boolean;
      className?: string;
    };

type RingState = "track" | "active" | "settled";

interface RingLabelText {
  text: string;
  /** id of the ring's label arc in the figure's <defs>. */
  arcId: string;
}

const CENTRE = LAYERS_VIEWBOX / 2;
const BORE_TRANSFORM = `translate(${CENTRE} ${CENTRE})`;

const DRAW_VARIANTS: Variants = {
  hidden: { pathLength: 0, transition: noTransition },
  visible: { pathLength: 1, transition: tween(durations.slow) },
};

const FILL_VARIANTS: Variants = {
  hidden: { scale: 0, transition: noTransition },
  visible: { scale: 1, transition: tween(durations.slow) },
};

// The wave follows the water in; its opacity hides the round-cap dot a
// zero-length stroke would leave.
const WAVE_VARIANTS: Variants = {
  hidden: { pathLength: 0, opacity: 0, transition: noTransition },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { ...tween(durations.slow), delay: durations.base },
      opacity: { duration: durations.instant, delay: durations.base },
    },
  },
};

interface FrameProps {
  className?: string;
  svgRef?: Ref<SVGSVGElement>;
  /** Marks the sticky figure for the e2e checks. */
  scene?: boolean;
  children: ReactNode;
}

function Frame({ className, svgRef, scene, children }: FrameProps) {
  return (
    <svg
      ref={svgRef}
      data-layers-scene={scene ? "" : undefined}
      viewBox={`0 0 ${LAYERS_VIEWBOX} ${LAYERS_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

function Track({ index }: { index: number }) {
  return (
    <circle
      cx={CENTRE}
      cy={CENTRE}
      r={ringRadius(index)}
      fill="none"
      strokeWidth={RING_WIDTH}
      className="stroke-border"
    />
  );
}

function RingLabel({ arcId, className, children }: { arcId: string; className: string; children: string }) {
  return (
    <text fontSize={LABEL_FONT_SIZE} textAnchor="middle" className={`font-semibold ${className}`}>
      <textPath href={`#${arcId}`} startOffset="50%">
        {children}
      </textPath>
    </text>
  );
}

/** A ring with no motion: bare track, the active band, or a settled band. The
 * label (desktop figure) is dark text, legible on the track and on a settled
 * band alike. */
function StaticRing({ index, state, label }: { index: number; state: RingState; label?: RingLabelText }) {
  return (
    <g>
      <Track index={index} />
      {state !== "track" && (
        <path
          data-layers-ring={index}
          d={ringPath(index)}
          fill="none"
          strokeWidth={RING_WIDTH}
          className="stroke-accent"
          opacity={state === "settled" ? SETTLED_OPACITY : undefined}
        />
      )}
      {label && (
        <RingLabel arcId={label.arcId} className="fill-primary-dark">
          {label.text}
        </RingLabel>
      )}
    </g>
  );
}

interface LiveRingProps {
  index: number;
  /** This ring's beat, then every later beat (the finale last). */
  ownAndLater: readonly MotionValue<number>[];
  /** The beat after this one: the next ring's, or the finale's. */
  next: MotionValue<number>;
  label: RingLabelText;
}

/** A ring of the sticky figure while scrolling: its band draws with its beat
 * (never behind a later beat), holds full accent while it is the active ring
 * and settles once the next beat is under way; an on-accent copy of the label
 * shows while the active band is under it. */
function LiveRing({ index, ownAndLater, next, label }: LiveRingProps) {
  const inputs = useMemo(() => [...ownAndLater], [ownAndLater]);
  const drawn = useTransform(inputs, (values: number[]) => ringDrawn(values));
  const settle = useTransform(next, ringSettle);
  const opacity = useTransform(settle, ringBandOpacity);
  const lit = useTransform([drawn, settle], ([d, s]: number[]) => ringLabelOpacity(d, s));
  // The two labels crossfade: dark glyphs left under the on-accent ones would
  // fringe their antialiased edges.
  const unlit = useTransform(lit, (value) => 1 - value);

  return (
    <g>
      <Track index={index} />
      <m.path
        data-layers-ring={index}
        d={ringPath(index)}
        fill="none"
        strokeWidth={RING_WIDTH}
        className="stroke-accent"
        style={{ pathLength: drawn, opacity }}
      />
      <m.g style={{ opacity: unlit }}>
        <RingLabel arcId={label.arcId} className="fill-primary-dark">
          {label.text}
        </RingLabel>
      </m.g>
      <m.g style={{ opacity: lit }}>
        <RingLabel arcId={label.arcId} className="fill-on-accent">
          {label.text}
        </RingLabel>
      </m.g>
    </g>
  );
}

/** Water and wave around (0, 0), placed by the group: a scale from the
 * circle's own centre then needs no measured box (the box of an element that
 * is display:none reads as zero, which here is still the centre). */
function StaticWater({ bore }: { bore: number }) {
  return (
    <g transform={BORE_TRANSFORM}>
      <circle r={bore} className="fill-primary-light/30" />
      <path
        d={wavePath(bore)}
        fill="none"
        strokeWidth={WAVE_STROKE}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-accent"
      />
    </g>
  );
}

function LiveWater({ bore, finale }: { bore: number; finale: MotionValue<number> }) {
  const fill = useTransform(finale, waterFill);
  const wave = useTransform(finale, waveDrawn);
  return (
    <g transform={BORE_TRANSFORM}>
      <m.circle r={bore} className="fill-primary-light/30" style={{ scale: fill }} />
      <DrawPath d={wavePath(bore)} progress={wave} strokeWidth={WAVE_STROKE} className="stroke-accent" />
    </g>
  );
}

function RevealWater({ bore, variant }: { bore: number; variant: "hidden" | "visible" }) {
  return (
    <g transform={BORE_TRANSFORM}>
      <m.circle r={bore} className="fill-primary-light/30" initial={false} animate={variant} variants={FILL_VARIANTS} />
      <m.path
        d={wavePath(bore)}
        fill="none"
        strokeWidth={WAVE_STROKE}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-accent"
        initial={false}
        animate={variant}
        variants={WAVE_VARIANTS}
      />
    </g>
  );
}

/**
 * The sticky figure. Its server HTML (and the no-JS page) is the blueprint:
 * every ring as a faint track, every label in place — nothing hidden, the
 * finished shape legible. The accent layer is drawn in the browser only:
 * finished at once under reduced motion; otherwise once the animation
 * features are in, scroll-linked, so rings the reader has passed draw in
 * and nothing that was on screen ever disappears.
 */
function ScrollCrossSection({
  rings,
  finale,
  className,
}: {
  rings: readonly LayersRing[];
  finale: MotionValue<number>;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const mounted = useMounted();
  const ready = useMotionReady();
  const reduce = useReducedMotion();
  const bore = boreRadius(rings.length);
  const layer = !mounted ? "blueprint" : reduce ? "final" : ready ? "live" : "blueprint";

  // Beats in drawing order, the finale last: ring i reads [i..] and [i + 1].
  const beats = useMemo(() => [...rings.map((ring) => ring.beat), finale], [rings, finale]);
  const ownAndLater = useMemo(() => rings.map((_, index) => beats.slice(index)), [rings, beats]);

  return (
    <Frame className={className} scene>
      <defs>
        {rings.map((ring, index) => (
          <path key={ring.id} id={`${uid}-${ring.id}`} d={labelArcPath(index)} />
        ))}
      </defs>
      {layer === "final" && <StaticWater bore={bore} />}
      {layer === "live" && <LiveWater bore={bore} finale={finale} />}
      {rings.map((ring, index) => {
        const label = { text: ring.label, arcId: `${uid}-${ring.id}` };
        return layer === "live" ? (
          <LiveRing key={ring.id} index={index} ownAndLater={ownAndLater[index]} next={beats[index + 1]} label={label} />
        ) : (
          <StaticRing key={ring.id} index={index} state={layer === "final" ? "settled" : "track"} label={label} />
        );
      })}
    </Frame>
  );
}

type RevealCrossSectionProps = Omit<Extract<LayersCrossSectionProps, { mode: "reveal" }>, "mode">;

/** A small figure that ships finished in the server HTML (useRevealPhase):
 * only when it starts below the fold is its new part hidden after mount, and
 * drawn once when it scrolls in. */
function RevealCrossSection({ count, active, water, className }: RevealCrossSectionProps) {
  const ref = useRef<SVGSVGElement>(null);
  const phase = useRevealPhase(ref, { amount: 0.5 });
  const variant = revealVariant(phase);
  const bore = boreRadius(count);

  return (
    <Frame className={className} svgRef={ref}>
      {water && <RevealWater bore={bore} variant={variant} />}
      {Array.from({ length: count }, (_, index) =>
        index === active ? (
          <g key={index}>
            <Track index={index} />
            <m.path
              data-layers-ring={index}
              d={ringPath(index)}
              fill="none"
              strokeWidth={RING_WIDTH}
              className="stroke-accent"
              initial={false}
              animate={variant}
              variants={DRAW_VARIANTS}
            />
          </g>
        ) : (
          <StaticRing key={index} index={index} state={active === null || index < active ? "settled" : "track"} />
        )
      )}
    </Frame>
  );
}

/**
 * The pipe cross-section of LayersStory: concentric rings (the layers of a
 * PP-R pipe wall, outer → inner) around the bore. Always aria-hidden — the
 * chapters carry the words. Bands scale with the figure; the wave is line art
 * and keeps its 1.5px stroke at any size.
 */
export function LayersCrossSection(props: LayersCrossSectionProps) {
  return props.mode === "scroll" ? (
    <ScrollCrossSection rings={props.rings} finale={props.finale} className={props.className} />
  ) : (
    <RevealCrossSection count={props.count} active={props.active} water={props.water} className={props.className} />
  );
}
