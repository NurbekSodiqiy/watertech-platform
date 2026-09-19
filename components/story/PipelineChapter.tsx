"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { m, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import { MaskReveal } from "@/components/motion/MaskReveal";
import { FittingGlyph, type FittingKind } from "@/components/story/fittings";
import { usePipelineChapter } from "@/components/story/PipelineStory";
import { useSceneProgress } from "@/hooks/useSceneProgress";
import { useSettledWhenReduced } from "@/hooks/useSettledWhenReduced";
import { springs, staggers, unitless } from "@/lib/motion/tokens";

/** A fitting sits slightly small until the water reaches it, then seats. */
const DRY_SCALE = 0.92;
const SEAT_SPRING = unitless(springs.snappy);

/**
 * The fitting on the main line. Dry and seated looks are two stacked layers
 * so seating is an opacity crossfade plus a scale — no colour animation.
 * Placed on the rail below md and on the centre line from md up (the same
 * `left` classes as PipelineStory's rail marker), level with the card title.
 */
function Fitting({ kind, seatAt }: { kind: FittingKind; seatAt: number | null }) {
  const progress = useSceneProgress();
  const wet = useTransform(progress, (latest): number => (seatAt !== null && latest >= seatAt ? 1 : 0));
  const seat = useSettledWhenReduced(useSpring(wet, SEAT_SPRING));
  const scale = useTransform(seat, [0, 1], [DRY_SCALE, 1]);

  return (
    <span
      data-pipeline-fitting
      aria-hidden="true"
      className="absolute left-0 top-3.5 h-10 w-10 md:left-1/2 md:-ml-6 md:h-12 md:w-12"
    >
      <m.span className="absolute inset-0" style={{ scale }}>
        <span className="absolute inset-0 rounded-full border border-border bg-surface text-text-secondary">
          <FittingGlyph kind={kind} className="h-full w-full" />
        </span>
        <m.span
          className="absolute inset-0 overflow-hidden rounded-full border border-accent/40 bg-surface text-accent"
          style={{ opacity: seat }}
        >
          <span className="absolute inset-0 bg-accent/10" />
          <FittingGlyph kind={kind} className="relative h-full w-full" />
        </m.span>
      </m.span>
    </span>
  );
}

/**
 * One chapter of a <PipelineStory>: a titled card hanging off the line at a
 * fitting. Cards alternate right/left from md up (first on the right) and sit
 * right of the rail below md. The text is always in the DOM; it is revealed
 * when the water reaches the fitting only if it was out of view at mount.
 */
export function PipelineChapter({ fitting, title, children }: { fitting: FittingKind; title: string; children: ReactNode }) {
  const { index, seatAt } = usePipelineChapter();
  const progress = useSceneProgress();
  const titleId = useId();
  const [reached, setReached] = useState(false);

  // The one state change the scene makes per chapter: latched the first time
  // the water reaches this fitting. Checked again when the geometry changes,
  // in case a re-measure moved the fitting behind the water front.
  useMotionValueEvent(progress, "change", (latest) => {
    if (!reached && seatAt !== null && latest >= seatAt) setReached(true);
  });
  useEffect(() => {
    if (seatAt !== null && progress.get() >= seatAt) setReached(true);
  }, [progress, seatAt]);

  const column = index % 2 === 0 ? "md:col-start-2" : "md:col-start-1";

  return (
    <section
      data-pipeline-chapter
      aria-labelledby={titleId}
      className="relative pl-14 md:grid md:grid-cols-2 md:gap-x-28 md:pl-0"
    >
      <Fitting kind={fitting} seatAt={seatAt} />
      <div data-pipeline-card className={`rounded-2xl border border-border bg-surface p-5 md:p-6 ${column}`}>
        <h2 id={titleId} className="text-[18px] font-bold leading-7 text-primary-dark">
          <MaskReveal when={reached}>{title}</MaskReveal>
        </h2>
        <MaskReveal
          as="div"
          when={reached}
          delay={staggers.step}
          className="mt-2 text-[15px] leading-relaxed text-text-secondary"
        >
          {children}
        </MaskReveal>
      </div>
    </section>
  );
}
