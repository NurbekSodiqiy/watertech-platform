"use client";

import { useId, useRef, type ReactNode } from "react";
import { m, type Variants } from "framer-motion";
import { CountUp } from "@/components/motion/CountUp";
import { EXPORT_MULTIPLIER, HOUSES_IN_ROW, barHeightPercent } from "@/components/story/manifest-geometry";
import { revealVariant, useRevealPhase } from "@/hooks/useRevealPhase";
import { durations, easings, noTransition } from "@/lib/motion/tokens";

export interface VisionLabels {
  /** Bar label of today's export volume ("Bugun"). */
  today: string;
  /** Bar label of the target year ("2030"). */
  target: string;
  /** What the ×3 measures ("MDH davlatlariga eksport"). */
  exportCaption: string;
  /** Under the houses ("har 3 ta yangi uydan birida"). */
  houses: string;
}

interface VisionSegmentProps {
  title: string;
  body: string;
  icon: ReactNode;
  labels: VisionLabels;
}

/** Bars grow from the baseline; `custom` is the bar's delay. */
const BAR_VARIANTS: Variants = {
  hidden: { scaleY: 0, transition: noTransition },
  visible: (delay: number) => ({ scaleY: 1, transition: { duration: durations.slow, ease: easings.standard, delay } }),
};

/** Our house fills once the bars have grown. */
const FILL_VARIANTS: Variants = {
  hidden: { opacity: 0, transition: noTransition },
  visible: { opacity: 1, transition: { duration: durations.base, ease: easings.standard, delay: durations.slow } },
};

const HOUSE_OUTLINE = "M5 14 L16 5 L27 14 M8 11.5 V27 H24 V11.5 M13.5 27 V20 H18.5 V27";
const HOUSE_FILL = "M8 11.5 L16 5 L24 11.5 V27 H8 Z";
/** Which house of the row is ours. */
const OUR_HOUSE = 0;

const HOUSES = Array.from({ length: HOUSES_IN_ROW }, (_, index) => index);

/**
 * Vision 2030 as a measurable goal: the text on the left, a small figure on
 * the right — export today (1×) against 2030 (×3), and one house in three.
 * The figure shows no number the copy does not say; it restates the
 * paragraph, so it is aria-hidden and the paragraph is what is read.
 *
 * One-shot: the bars grow and the house fills once, when the figure scrolls
 * into view (useRevealPhase — the server HTML, reduced motion and a figure
 * already on screen at mount show the finished drawing).
 */
export function VisionSegment({ title, body, icon, labels }: VisionSegmentProps) {
  const titleId = useId();
  const figureRef = useRef<HTMLDivElement>(null);
  const phase = useRevealPhase(figureRef, { amount: 0.4 });
  const variant = revealVariant(phase);

  const bars = [
    { key: "today", label: labels.today, height: barHeightPercent(1), fill: "bg-accent/30", delay: 0 },
    {
      key: "target",
      label: labels.target,
      height: barHeightPercent(EXPORT_MULTIPLIER),
      fill: "bg-accent",
      delay: durations.instant,
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-6 rounded-2xl border border-border bg-surface p-5 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center md:gap-10 md:p-6"
    >
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
          {icon}
        </span>
        <h2 id={titleId} className="mt-4 text-[24px] font-bold leading-tight tracking-tight text-primary-dark">
          {title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">{body}</p>
      </div>

      <div ref={figureRef} aria-hidden="true" className="rounded-xl bg-surface-alt p-4">
        <p className="text-[12px] font-medium text-text-secondary">{labels.exportCaption}</p>

        {/* The value sits over the 2030 bar, in the same two columns as the bars and labels. */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
          <span />
          <CountUp value={EXPORT_MULTIPLIER} prefix="×" className="text-[20px] font-bold leading-none text-primary-dark" />
        </div>
        <div className="mt-2 flex h-24 items-end gap-3">
          {bars.map((bar) => (
            <m.div
              key={bar.key}
              data-manifest-bar={bar.key}
              className={`flex-1 origin-bottom rounded-t-lg ${bar.fill}`}
              style={{ height: `${bar.height}%` }}
              initial={false}
              animate={variant}
              variants={BAR_VARIANTS}
              custom={bar.delay}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-2 text-center text-[12px] font-medium text-text-secondary">
          {bars.map((bar) => (
            <span key={bar.key}>{bar.label}</span>
          ))}
        </div>

        <div className="mt-5 flex items-end gap-2">
          {HOUSES.map((index) => (
            <svg key={index} viewBox="0 0 32 32" className="h-8 w-8 text-accent">
              {index === OUR_HOUSE ? (
                <m.path
                  data-manifest-house-fill=""
                  d={HOUSE_FILL}
                  className="fill-accent/30"
                  initial={false}
                  animate={variant}
                  variants={FILL_VARIANTS}
                />
              ) : null}
              <path
                d={HOUSE_OUTLINE}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-medium text-text-secondary">{labels.houses}</p>
      </div>
    </section>
  );
}
