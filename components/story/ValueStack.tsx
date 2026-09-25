"use client";

import { Fragment, useEffect, useId, useRef, type MutableRefObject, type ReactNode } from "react";
import { m, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import {
  COVERED_OPACITY,
  COVERED_SCALE,
  coverProgress,
  stackTopClass,
  type StackCardBox,
} from "@/components/story/manifest-geometry";
import { useSettledWhenReduced } from "@/hooks/useSettledWhenReduced";
import { springs } from "@/lib/motion/tokens";

export interface ManifestValue {
  /** Stable key (the message key of the value). */
  id: string;
  title: string;
  body: string;
  /** Rendered in the round badge beside the title. */
  icon: ReactNode;
}

/** What the scroll maths needs, measured once per layout change — not per frame. */
interface StackLayout {
  cards: StackCardBox[];
  /** Document y of each card's in-flow top (its sentinel); null for the first. */
  flowTops: (number | null)[];
}

interface StackCardProps {
  value: ManifestValue;
  index: number;
  scrollY: MotionValue<number>;
  layout: MutableRefObject<StackLayout | null>;
  /** Bumped after every measurement, so the cover values recompute without a scroll. */
  revision: MotionValue<number>;
  setCard: (index: number, node: HTMLElement | null) => void;
}

/** 0 → 1 as card `index + 1` slides over card `index` (0 for the last card). */
function coverOf(index: number, scrollY: number, layout: StackLayout | null): number {
  const current = layout?.cards[index];
  const next = layout?.cards[index + 1];
  const nextFlowTop = layout?.flowTops[index + 1];
  if (!current || !next || nextFlowTop === null || nextFlowTop === undefined) return 0;
  return coverProgress(nextFlowTop - scrollY, current, next.stickyTop);
}

function StackCard({ value, index, scrollY, layout, revision, setCard }: StackCardProps) {
  const titleId = useId();
  const raw = useTransform<number, number>([scrollY, revision], ([latest = 0]) => coverOf(index, latest, layout.current));
  // Reduced motion holds the card at "not covered": full size, full strength.
  const cover = useSettledWhenReduced(useSpring(raw, springs.fluid), 0);
  const scale = useTransform(cover, [0, 1], COVERED_SCALE);
  const opacity = useTransform(cover, [0, 1], COVERED_OPACITY);

  return (
    <m.article
      ref={(node: HTMLElement | null) => setCard(index, node)}
      aria-labelledby={titleId}
      data-manifest-card={value.id}
      className={`sticky ${stackTopClass(index)} origin-top rounded-2xl border border-border bg-surface shadow-soft`}
      style={{ scale }}
    >
      <m.div className="min-h-[12rem] p-5 sm:min-h-[10.5rem] md:p-6" style={{ opacity }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
            {value.icon}
          </span>
          <h2 id={titleId} className="text-[18px] font-bold leading-7 text-primary-dark">
            {value.title}
          </h2>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">{value.body}</p>
      </m.div>
    </m.article>
  );
}

/**
 * The values as sticky stacking cards: each card pins under the TopBar a step
 * lower than the one before (stackTop), and the next card slides over it. As
 * it does, the covered card shrinks to 0.96 and its content dims to 0.6 —
 * driven by the next card's position (coverProgress), from the moment it
 * reaches the covered card's bottom to the moment it lands. So a card is at
 * full strength whenever nothing overlaps it.
 *
 * The positions come from zero-height sentinels in the flow (a stuck card's
 * own box moves with the scroll), measured on mount and whenever the page's
 * layout changes; the page scroll is read as a motion value, so scrolling
 * never renders React. The last card is never covered, and the stack's
 * container ends with it, so the section releases with the normal scroll.
 *
 * Server HTML, no-JS and reduced motion: sticky cards, none scaled or dimmed.
 */
export function ValueStack({ values }: { values: readonly ManifestValue[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardNodes = useRef<(HTMLElement | null)[]>([]);
  const sentinelNodes = useRef<(HTMLDivElement | null)[]>([]);
  const layout = useRef<StackLayout | null>(null);
  const revision = useMotionValue(0);
  const { scrollY } = useScroll();

  const setCard = (index: number, node: HTMLElement | null) => {
    cardNodes.current[index] = node;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const scroll = window.scrollY;
      layout.current = {
        cards: values.map((_, index) => {
          const card = cardNodes.current[index];
          if (!card) return { stickyTop: 0, height: 0 };
          const top = Number.parseFloat(window.getComputedStyle(card).top);
          // offsetHeight ignores the transform, so a covered card measures full size.
          return { stickyTop: Number.isFinite(top) ? top : 0, height: card.offsetHeight };
        }),
        flowTops: values.map((_, index) => {
          const sentinel = sentinelNodes.current[index];
          return sentinel ? sentinel.getBoundingClientRect().top + scroll : null;
        }),
      };
      revision.set(revision.get() + 1);
    };

    measure();
    // The container catches its own reflow; the body catches anything above
    // it changing height (fonts, the mission sentence wrapping differently).
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [values, revision]);

  return (
    <div ref={containerRef}>
      {values.map((value, index) => (
        <Fragment key={value.id}>
          {index > 0 ? (
            <div
              ref={(node) => {
                sentinelNodes.current[index] = node;
              }}
              aria-hidden="true"
              className="mt-6"
            />
          ) : null}
          <StackCard
            value={value}
            index={index}
            scrollY={scrollY}
            layout={layout}
            revision={revision}
            setCard={setCard}
          />
        </Fragment>
      ))}
    </div>
  );
}
