"use client";

import { useId, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { CHAPTER_BEAT_OFFSET } from "@/components/story/layers-geometry";
import { LayersCrossSection } from "@/components/story/LayersCrossSection";
import { useScrollBeat } from "@/hooks/useScrollBeat";

interface LayersChapterProps {
  /** Position in the story; the chapter's ring (0 = outermost). */
  index: number;
  /** Number of chapters, for the inline cross-section. */
  count: number;
  title: string;
  body: string;
  /** Receives this chapter's beat: its heading's progress through CHAPTER_BEAT_OFFSET. */
  beat: MotionValue<number>;
}

/**
 * One chapter of a <LayersStory>. The chapter owns its ring: its heading's
 * scroll position is the beat that draws the ring in the sticky figure
 * (≥ lg). Below lg the card carries its own 56px cross-section with the rings
 * up to this chapter, its ring drawn once on entering the view. The text is
 * plain, static markup — only the rings move.
 */
export function LayersChapter({ index, count, title, body, beat }: LayersChapterProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useScrollBeat(headingRef, CHAPTER_BEAT_OFFSET, beat);

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <div className="flex items-center gap-3">
        <LayersCrossSection
          mode="reveal"
          count={count}
          active={index}
          water={false}
          className="h-14 w-14 shrink-0 lg:hidden"
        />
        <h2 ref={headingRef} id={titleId} className="text-[18px] font-bold leading-7 text-primary-dark">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{body}</p>
    </section>
  );
}
