"use client";

import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import { cancelFrame, frame, m, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { DrawPath } from "@/components/motion/DrawPath";
import { MISSION_BEAT_OFFSET, WORD_OPACITY, splitWords, wordRange } from "@/components/story/manifest-geometry";
import { useRevealPhase } from "@/hooks/useRevealPhase";
import { springs } from "@/lib/motion/tokens";

interface MissionWordsProps {
  /** The label heading ("Missiya"). */
  title: string;
  sentence: string;
  /** Rendered in the round badge before the label. */
  icon: ReactNode;
}

const UNDERLINE_PATH = "M1 1 H99";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, WORD_OPACITY);
  return (
    <m.span data-manifest-word="" style={{ opacity }}>
      {word}
    </m.span>
  );
}

/**
 * The mission, read like a statement: set large, lit word by word in reading
 * order as the sentence travels up the screen (MISSION_BEAT_OFFSET). One
 * useScroll for the sentence; each word maps that progress through its own
 * window (wordRange) — motion values only, scrolling never renders React.
 *
 * Nothing ships dimmed: the progress the words read (`lit`) starts at 1, so
 * the server HTML, the no-JS page and reduced motion show the whole sentence.
 * It follows the scroll only once useRevealPhase has armed the sentence —
 * below the fold at mount, where nobody can see it dim. A sentence already on
 * screen at mount stays lit rather than fading out under the reader's eyes.
 *
 * Screen readers get the sentence once, from the visually hidden copy; the
 * word spans are aria-hidden.
 */
export function MissionWords({ title, sentence, icon }: MissionWordsProps) {
  const titleId = useId();
  const sentenceRef = useRef<HTMLParagraphElement>(null);
  const phase = useRevealPhase(sentenceRef);

  const { scrollYProgress } = useScroll({ target: sentenceRef, offset: MISSION_BEAT_OFFSET });
  const smooth = useSpring(scrollYProgress, springs.fluid);
  const lit = useMotionValue(1);

  // Deferred a frame, like useSettledWhenReduced: an earlier write could be
  // overwritten when the lazily loaded features build the word elements.
  useEffect(() => {
    const follow = phase !== "static";
    const sync = () => lit.set(follow ? smooth.get() : 1);
    frame.update(sync);
    const unsubscribe = follow ? smooth.on("change", (latest) => lit.set(latest)) : undefined;
    return () => {
      cancelFrame(sync);
      unsubscribe?.();
    };
  }, [phase, smooth, lit]);

  const words = useMemo(() => splitWords(sentence), [sentence]);

  return (
    <section aria-labelledby={titleId}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
          {icon}
        </span>
        <div className="inline-flex flex-col">
          <h2 id={titleId} className="text-[15px] font-semibold leading-6 text-accent">
            {title}
          </h2>
          <svg
            aria-hidden="true"
            data-manifest-line="underline"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
            className="block h-[2px] w-full overflow-visible"
          >
            <DrawPath d={UNDERLINE_PATH} className="stroke-accent" strokeWidth={1.5} />
          </svg>
        </div>
      </div>

      <p
        ref={sentenceRef}
        className="mt-6 max-w-[22ch] text-left text-[28px] font-bold leading-tight tracking-tight text-primary-dark sm:text-[32px]"
      >
        <span className="sr-only">{sentence}</span>
        <span aria-hidden="true">
          {words.map((word, index) => (
            <span key={`${index}-${word}`}>
              {index > 0 ? " " : null}
              <Word word={word} progress={lit} range={wordRange(index, words.length)} />
            </span>
          ))}
        </span>
      </p>
    </section>
  );
}
