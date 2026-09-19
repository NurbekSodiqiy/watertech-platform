"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  m,
  useIsomorphicLayoutEffect,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type UseScrollOptions,
} from "framer-motion";
import { CountUp } from "@/components/motion/CountUp";
import { DrawPath } from "@/components/motion/DrawPath";
import { ScrollScene } from "@/components/motion/ScrollScene";
import { FittingGlyph, GLYPH_SIZE, TANK_BODY_PATH, TANK_INLET, TANK_WATER } from "@/components/story/fittings";
import {
  buildPipeline,
  MIN_TANK_SHARE,
  pointAtLength,
  type PipelineGeometry,
  type PipelineMeasurements,
  type Route,
} from "@/components/story/geometry";
import { useSceneProgress } from "@/hooks/useSceneProgress";
import { durations, tween } from "@/lib/motion/tokens";

export interface PipelineTankFinale {
  kind: "tank";
  caption?: string;
  value?: number;
  suffix?: string;
}

export type PipelineFinale = PipelineTankFinale;

// Progress is 0 when the story's top reaches two thirds of the way down the
// viewport, so the water front runs about a third of a viewport ahead of the
// reader's eye, and 1 when its bottom reaches the viewport bottom — a point
// the page can always scroll to, since only page padding follows the story.
const SCENE_OFFSET: UseScrollOptions["offset"] = ["start 0.66", "end end"];

/** Stroke widths, px: the dry pipe is a body with a bore; water fills the bore. */
const PIPE_BODY = 10;
const PIPE_BORE = 6;
const WATER = 6;
const HEAD_RADIUS = 3;

/** Resizes arrive in bursts (window drag, sidebar toggle); measure once they settle. */
const REMEASURE_DEBOUNCE_MS = 120;

const GeometryContext = createContext<PipelineGeometry | null>(null);
const ChapterIndexContext = createContext<number | null>(null);

/** For <PipelineChapter>: its position in the story and the progress at which its fitting seats. */
export function usePipelineChapter(): { index: number; seatAt: number | null } {
  const index = useContext(ChapterIndexContext);
  const geometry = useContext(GeometryContext);
  if (index === null) throw new Error("<PipelineChapter> must be a direct child of <PipelineStory>.");
  return { index, seatAt: geometry?.fittings[index]?.seatAt ?? null };
}

function tenth(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Reads anchor positions relative to the container. Runs on mount and after
 * resizes only — never on scroll. */
function measure(container: HTMLElement): PipelineMeasurements {
  const box = container.getBoundingClientRect();
  const rail = container.querySelector("[data-pipeline-rail]");
  const lineX = rail ? rail.getBoundingClientRect().left - box.left : box.width / 2;

  const fittings = Array.from(container.querySelectorAll("[data-pipeline-chapter]"), (chapter) => {
    const fitting = chapter.querySelector("[data-pipeline-fitting]")?.getBoundingClientRect();
    const card = chapter.querySelector("[data-pipeline-card]")?.getBoundingClientRect();
    if (!fitting || !card) return { y: tenth(chapter.getBoundingClientRect().top - box.top), radius: 0, branchToX: lineX };
    const left = card.left - box.left;
    const right = card.right - box.left;
    return {
      y: tenth(fitting.top + fitting.height / 2 - box.top),
      radius: tenth(fitting.width / 2),
      branchToX: tenth(left >= lineX ? left : right <= lineX ? right : lineX),
    };
  });

  const tank = container.querySelector("[data-pipeline-tank]")?.getBoundingClientRect();
  const inlet = tank
    ? {
        x: tenth(tank.left - box.left + (tank.width * TANK_INLET.x) / GLYPH_SIZE),
        y: tenth(tank.top - box.top + (tank.height * TANK_INLET.y) / GLYPH_SIZE),
      }
    : null;

  return { width: tenth(box.width), height: tenth(box.height), lineX: tenth(lineX), fittings, inlet };
}

function usePipelineGeometry(ref: RefObject<HTMLDivElement>): PipelineGeometry | null {
  const [geometry, setGeometry] = useState<PipelineGeometry | null>(null);

  // Layout effect: the first measurement lands before the hydrated page paints.
  useIsomorphicLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    let active = true;
    let lastKey = "";
    let timer: number | undefined;

    const update = () => {
      const measurements = measure(container);
      const key = JSON.stringify(measurements);
      if (key === lastKey) return;
      lastKey = key;
      setGeometry(buildPipeline(measurements));
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, REMEASURE_DEBOUNCE_MS);
    };

    update();
    // Chapter heights (font swap, reflowed text) all show up as a change in
    // the container's own size.
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    void document.fonts.ready.then(() => {
      if (active) schedule();
    });

    return () => {
      active = false;
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [ref]);

  return geometry;
}

function BranchWater({ d, seatAt, filledAt }: { d: string; seatAt: number; filledAt: number }) {
  const progress = useSceneProgress();
  const fill = useTransform(progress, [seatAt, filledAt], [0, 1]);
  return <DrawPath d={d} progress={fill} strokeWidth={WATER} className="stroke-accent" />;
}

/** The leading drop of water, riding the tip of the water stroke. */
function WaterHead({ route, water }: { route: Route; water: MotionValue<number> }) {
  const x = useTransform(water, (w) => pointAtLength(route, w * route.length).x);
  const y = useTransform(water, (w) => pointAtLength(route, w * route.length).y);
  // Hidden before the water starts and once it has run into the tank.
  const opacity = useTransform(water, [0, 0.01, 0.99, 1], [0, 1, 1, 0]);
  return <m.circle cx={0} cy={0} r={HEAD_RADIUS} className="fill-accent" style={{ x, y, opacity }} />;
}

function PipelineDrawing({ geometry }: { geometry: PipelineGeometry }) {
  const progress = useSceneProgress();
  const reduce = useReducedMotion();
  const water = useTransform(progress, [0, geometry.lineEnd], [0, 1]);
  const { main, fittings } = geometry;

  // Fittings are listed in chapter order, which never reorders, so their
  // index is a stable key.
  return (
    <m.svg
      aria-hidden="true"
      width={geometry.width}
      height={geometry.height}
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={tween(durations.base)}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={main.d} strokeWidth={PIPE_BODY} className="stroke-border" />
        {fittings.map((f, i) =>
          f.branch ? <path key={i} d={f.branch.d} strokeWidth={PIPE_BODY} className="stroke-border" /> : null
        )}
        <path d={main.d} strokeWidth={PIPE_BORE} className="stroke-surface" />
        {fittings.map((f, i) =>
          f.branch ? <path key={i} d={f.branch.d} strokeWidth={PIPE_BORE} className="stroke-surface" /> : null
        )}
      </g>
      <DrawPath d={main.d} progress={water} strokeWidth={WATER} className="stroke-accent" />
      {fittings.map((f, i) =>
        f.branch ? <BranchWater key={i} d={f.branch.d} seatAt={f.seatAt} filledAt={f.filledAt} /> : null
      )}
      <WaterHead route={main} water={water} />
    </m.svg>
  );
}

function TankFinale({ finale, lineEnd }: { finale: PipelineFinale; lineEnd: number }) {
  const progress = useSceneProgress();
  const level = useTransform(progress, [lineEnd, 1], [0, 1]);
  const surfaceY = useTransform(level, [0, 1], [0, -TANK_WATER.height]);
  const surfaceOpacity = useTransform(level, [0, 0.02], [0, 1]);
  const clipId = `pipeline-tank-${useId().replace(/:/g, "")}`;
  const bottom = TANK_WATER.y + TANK_WATER.height;
  const hasCaption = finale.value !== undefined || Boolean(finale.caption);

  // Always in the right-hand column (≥ md): the line jogs right into it, and
  // on the rail layout it sits where the chapter cards do.
  return (
    <div className="relative pl-14 pt-8 md:grid md:grid-cols-2 md:gap-x-28 md:pl-0">
      <div className="flex items-end gap-4 md:col-start-2">
        <div data-pipeline-tank className="relative h-20 w-20 shrink-0 md:h-24 md:w-24">
          <svg
            viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <defs>
              <clipPath id={clipId}>
                <path d={TANK_BODY_PATH} />
              </clipPath>
            </defs>
            <path d={TANK_BODY_PATH} className="fill-surface" />
            {/* The clip sits on the group, not the scaled rect: a clip on a
                transformed element would scale along with it. */}
            <g clipPath={`url(#${clipId})`}>
              <m.rect
                x={TANK_WATER.x}
                y={TANK_WATER.y}
                width={TANK_WATER.width}
                height={TANK_WATER.height}
                className="fill-accent/25"
                style={{ scaleY: level, originY: 1 }}
              />
              <m.path
                d={`M${TANK_WATER.x} ${bottom} H${TANK_WATER.x + TANK_WATER.width}`}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                className="stroke-accent"
                style={{ y: surfaceY, opacity: surfaceOpacity }}
              />
            </g>
          </svg>
          <FittingGlyph kind="tank" className="absolute inset-0 h-full w-full text-text-secondary" />
        </div>
        {hasCaption && (
          <div className="min-w-0 pb-1">
            {finale.value !== undefined && (
              <p className="text-[28px] font-extrabold leading-none text-primary-dark">
                <CountUp value={finale.value} suffix={finale.suffix} />
              </p>
            )}
            {finale.caption && <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{finale.caption}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineCanvas({ finale, children }: { finale: PipelineFinale; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const geometry = usePipelineGeometry(ref);
  const chapters = Children.toArray(children).filter(isValidElement);

  return (
    <div ref={ref} className="relative">
      {/* Zero-size marker whose x is the main line: the left rail below md,
          the centre from md up. Fittings are placed with the same classes. */}
      <span data-pipeline-rail aria-hidden="true" className="pointer-events-none absolute left-5 top-0 md:left-1/2" />
      {geometry && <PipelineDrawing geometry={geometry} />}
      <GeometryContext.Provider value={geometry}>
        <div className="relative space-y-6 pt-6 md:space-y-8">
          {chapters.map((chapter, index) => (
            <ChapterIndexContext.Provider key={chapter.key ?? index} value={index}>
              {chapter}
            </ChapterIndexContext.Provider>
          ))}
        </div>
      </GeometryContext.Provider>
      <TankFinale finale={finale} lineEnd={geometry?.lineEnd ?? 1 - MIN_TANK_SHARE} />
    </div>
  );
}

/**
 * The signature scroll scene: a pipeline being commissioned down the page.
 * Water advances through the main line as the reader scrolls; when it reaches
 * a chapter's fitting the fitting seats, a branch fills toward the chapter
 * and its text is revealed; the line ends in a tank whose level rises over
 * the last stretch of scroll.
 *
 * Children are <PipelineChapter>s, as direct children, in reading order.
 * Everything animated derives from the one ScrollScene progress value, so
 * scrolling back up runs it all in reverse; the only React updates are
 * re-measurement after resizes and one latched flag per chapter. Under
 * reduced motion the final state shows: line full, fittings seated, tank full.
 */
export function PipelineStory({ finale, children }: { finale: PipelineFinale; children: ReactNode }) {
  return (
    <ScrollScene offset={SCENE_OFFSET}>
      <PipelineCanvas finale={finale}>{children}</PipelineCanvas>
    </ScrollScene>
  );
}
