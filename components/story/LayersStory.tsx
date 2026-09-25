"use client";

import { useMemo, useRef } from "react";
import { motionValue } from "framer-motion";
import { FINALE_BEAT_OFFSET } from "@/components/story/layers-geometry";
import { LayersChapter } from "@/components/story/LayersChapter";
import { LayersCrossSection, type LayersRing } from "@/components/story/LayersCrossSection";
import { useScrollBeat } from "@/hooks/useScrollBeat";

export interface LayersStoryChapter {
  /** Stable key (the message key of the chapter). */
  id: string;
  title: string;
  body: string;
  /** Short word printed on the chapter's ring. */
  ringLabel: string;
}

interface LayersStoryProps {
  /** In reading order: the first is the pipe's outer layer. */
  chapters: readonly LayersStoryChapter[];
  finaleCaption: string;
}

/**
 * "Qatlamlar" — the /company/about scene (CLAUDE.md §14). WaterTech makes
 * multilayer PP-R pipe and was built layer by layer, like a pipe wall: one
 * ring per chapter, outer → inner, and water fills the bore at the end.
 *
 * ≥ lg: a sticky cross-section on the left, the chapters on the right. Each
 * chapter's heading drives its own ring (CHAPTER_BEAT_OFFSET), the finale
 * block drives the water (FINALE_BEAT_OFFSET); all of it is motion values,
 * so scrolling back runs it in reverse and never re-renders React.
 * < lg: no sticky column; every chapter card carries a small cross-section
 * and the finale shows the whole one, each drawn once as it scrolls in.
 *
 * Text is never animated: the server HTML, the no-JS page and reduced motion
 * all read the same. What the figures show before the browser takes over is
 * described in LayersCrossSection.
 */
export function LayersStory({ chapters, finaleCaption }: LayersStoryProps) {
  const count = chapters.length;
  const finaleRef = useRef<HTMLDivElement>(null);

  // One beat per chapter and one for the finale, created once per story.
  // Chapters write them (useScrollBeat), the sticky figure reads them.
  const beats = useMemo(
    () => ({ chapters: Array.from({ length: count }, () => motionValue(0)), finale: motionValue(0) }),
    [count]
  );
  useScrollBeat(finaleRef, FINALE_BEAT_OFFSET, beats.finale);

  const rings = useMemo<LayersRing[]>(
    () => chapters.map((chapter, index) => ({ id: chapter.id, label: chapter.ringLabel, beat: beats.chapters[index] })),
    [chapters, beats]
  );

  return (
    <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-12">
      {/* The figure's cell spans the whole story, so the figure stays pinned
          (below the 56px TopBar) from the first chapter to the finale. */}
      <div className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-border bg-surface p-3 xl:p-4">
          <LayersCrossSection mode="scroll" rings={rings} finale={beats.finale} className="block aspect-square w-full" />
        </div>
      </div>

      <div className="space-y-6">
        {chapters.map((chapter, index) => (
          <LayersChapter
            key={chapter.id}
            index={index}
            count={count}
            title={chapter.title}
            body={chapter.body}
            beat={beats.chapters[index]}
          />
        ))}

        {/* ≥ lg the finale is also the story's run-out: its top must be able
            to climb to 40% of the viewport (the end of its beat) with only
            the page padding below, so it is at least 60vh tall. */}
        <div ref={finaleRef} className="pt-2 lg:min-h-[60vh]">
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <LayersCrossSection mode="reveal" count={count} active={null} water className="h-48 w-48 lg:hidden" />
            <p className="max-w-md text-[15px] font-semibold leading-relaxed text-primary-dark">{finaleCaption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
