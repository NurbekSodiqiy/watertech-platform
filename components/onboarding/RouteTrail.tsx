"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { m, useIsomorphicLayoutEffect, useSpring, useTransform } from "framer-motion";
import { ScrollScene } from "@/components/motion/ScrollScene";
import {
  capFraction,
  pointAtFraction,
  ROUTE_SCROLL_OFFSET,
  routeFromSegments,
  sampleCount,
  trailFraction,
  travellerOpacity,
  visibleFloor,
  type TrailInput,
  type MeasuredRoute,
  type RouteSamples,
  type SegmentBox,
} from "@/components/onboarding/route-geometry";
import { useMotionReady } from "@/hooks/useMotionReady";
import { useSceneProgress } from "@/hooks/useSceneProgress";
import { springs } from "@/lib/motion/tokens";

/** Same widths as the server-drawn route in RouteMap. */
const LINE_WIDTH = 3;
const TRAVELLER_RADIUS = 5;
const TRAVELLER_RING = 2;

interface RouteTrailProps {
  /** The route container: holds RouteMap's [data-route-segment] boxes, and
   * this layer covers it exactly. */
  routeRef: RefObject<HTMLElement>;
  /** Segments the reader has reached (journey().reached). */
  reached: number;
  /** Whether `reached` is the reader's real progress yet. */
  ready: boolean;
  /** true once this layer draws the solid line, so RouteMap stops drawing
   * its static copy; false when it unmounts. */
  onActive: (active: boolean) => void;
}

interface Geometry {
  readonly route: MeasuredRoute;
  readonly width: number;
  readonly height: number;
}

/** One measured geometry with its samples: the drawn path, the cap and the
 * traveller always come from the same snapshot, so a re-layout can never pair
 * new checkpoints with old samples. */
interface Trail {
  readonly d: string;
  readonly joints: MeasuredRoute["joints"];
  readonly height: number;
  readonly samples: RouteSamples;
  /** visibleFloor() when the layer took over. */
  readonly floor: number;
}

function tenth(n: number): number {
  return Math.round(n * 10) / 10;
}

/** A share written by RouteMap into data-from / data-to. */
function readShare(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0.5;
}

/** Reads the segment boxes relative to the container. Runs on mount and on
 * resize only — never on scroll. The layout that is not showing (stacked or
 * alternating) is display:none and has no client rects. */
function measure(container: HTMLElement): { boxes: SegmentBox[]; width: number; height: number } {
  const box = container.getBoundingClientRect();
  const boxes = Array.from(container.querySelectorAll<HTMLElement>("[data-route-segment]"))
    .filter((el) => el.getClientRects().length > 0)
    .map((el): SegmentBox => {
      const r = el.getBoundingClientRect();
      return {
        left: tenth(r.left - box.left),
        top: tenth(r.top - box.top),
        width: tenth(r.width),
        height: tenth(r.height),
        from: readShare(el.dataset.from),
        to: readShare(el.dataset.to),
      };
    });
  return { boxes, width: tenth(box.width), height: tenth(box.height) };
}

function useRouteGeometry(routeRef: RefObject<HTMLElement>): Geometry | null {
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  useIsomorphicLayoutEffect(() => {
    const container = routeRef.current;
    if (!container) return;
    let lastKey = "";

    const update = () => {
      const measured = measure(container);
      const key = JSON.stringify(measured);
      if (key === lastKey) return;
      lastKey = key;
      const route = routeFromSegments(measured.boxes);
      setGeometry(route ? { route, width: measured.width, height: measured.height } : null);
    };

    update();
    // A card opening or closing, a font swap or a new window width: each
    // resizes the container or, when the heights cancel out, the segments of
    // the rows that changed.
    const observer = new ResizeObserver(update);
    observer.observe(container);
    container.querySelectorAll("[data-route-segment]").forEach((segment) => observer.observe(segment));
    return () => observer.disconnect();
  }, [routeRef]);

  return geometry;
}

function TrailDrawing({ routeRef, reached, ready, onActive }: RouteTrailProps) {
  const motionReady = useMotionReady();
  const geometry = useRouteGeometry(routeRef);
  const sampleRef = useRef<SVGPathElement>(null);
  const [trail, setTrail] = useState<Trail | null>(null);

  // getPointAtLength samples of each new path — on mount and resize only.
  // The floor is taken once, at the first sampling: what the reader could see
  // when this layer took over stays drawn.
  useIsomorphicLayoutEffect(() => {
    const path = sampleRef.current;
    const container = routeRef.current;
    if (!path || !container || !geometry) return;
    const length = path.getTotalLength();
    const count = sampleCount(length);
    const samples = Array.from({ length: count }, (_, i) => {
      const point = path.getPointAtLength((length * i) / (count - 1));
      return { x: point.x, y: point.y };
    });
    setTrail((previous) => ({
      d: geometry.route.d,
      joints: geometry.route.joints,
      height: geometry.height,
      samples,
      floor: previous?.floor ?? visibleFloor(window.innerHeight, container.getBoundingClientRect().top),
    }));
  }, [geometry, routeRef]);

  // The reader's real progress as a fraction of the line. A tick eases the
  // line along with the same spring as the scroll; everything else jumps —
  // the first real value, anything before the progress has loaded, and a
  // re-layout, which moves the checkpoints but is not progress.
  const cap = useSpring(0, springs.fluid);
  const tickedFrom = useRef<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!trail) return;
    const target = capFraction(trail.samples, trail.joints, reached);
    const isTick = tickedFrom.current !== null && tickedFrom.current !== reached;
    if (isTick) cap.set(target);
    else cap.jump(target);
    if (ready) tickedFrom.current = reached;
  }, [trail, reached, ready, cap]);

  const active = motionReady && trail !== null;
  useIsomorphicLayoutEffect(() => {
    if (active) onActive(true);
  }, [active, onActive]);
  useEffect(() => () => onActive(false), [onActive]);

  const progress = useSceneProgress();
  const input = (values: number[]): TrailInput => {
    const [scrolled = 0, reachedFraction = 0] = values;
    return { progress: scrolled, height: trail?.height ?? 0, floor: trail?.floor ?? 0, cap: reachedFraction };
  };
  const drawn = useTransform([progress, cap], (values: number[]) => (trail ? trailFraction(trail.samples, input(values)) : 0));
  const lineOpacity = useTransform(drawn, [0, 0.005], [0, 1]);
  const x = useTransform(drawn, (f) => (trail ? pointAtFraction(trail.samples, f).x : 0));
  const y = useTransform(drawn, (f) => (trail ? pointAtFraction(trail.samples, f).y : 0));
  const travellerVisible = useTransform([progress, cap], (values: number[]) =>
    trail ? travellerOpacity(trail.samples, input(values)) : 0
  );

  if (!geometry) return null;

  return (
    <svg
      width={geometry.width}
      height={geometry.height}
      data-route-trail={active ? "active" : "measuring"}
      className="absolute left-0 top-0 overflow-visible"
    >
      {/* Only measured, never painted. */}
      <path ref={sampleRef} d={geometry.route.d} fill="none" stroke="none" />
      {active && trail && (
        <>
          <m.path
            d={trail.d}
            fill="none"
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            className="stroke-accent"
            style={{ pathLength: drawn, opacity: lineOpacity }}
          />
          <m.circle
            data-route-traveller=""
            cx={0}
            cy={0}
            r={TRAVELLER_RADIUS}
            strokeWidth={TRAVELLER_RING}
            className="fill-accent stroke-surface"
            style={{ x, y, opacity: travellerVisible }}
          />
        </>
      )}
    </svg>
  );
}

/**
 * The route's scroll layer, loaded lazily by RouteMap once the page is idle
 * and only when motion is allowed. It lays one measured path over the
 * server-drawn route — the same curves (route-geometry) — and draws it with
 * scroll (pathLength, springs.fluid through ScrollScene) up to the reader's
 * real progress, with a small traveller riding the tip.
 *
 * Everything that moves is a motion value: scrolling never re-renders React.
 * Geometry and getPointAtLength samples are taken on mount and resize only.
 * What was on screen when it took over stays drawn, so the static route the
 * server sent is never taken back in front of the reader.
 */
export function RouteTrail(props: RouteTrailProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <ScrollScene offset={ROUTE_SCROLL_OFFSET} className="h-full">
        <TrailDrawing {...props} />
      </ScrollScene>
    </div>
  );
}
