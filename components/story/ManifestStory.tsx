"use client";

import type { ReactNode } from "react";
import { DrawPath } from "@/components/motion/DrawPath";
import { MissionWords } from "@/components/story/MissionWords";
import { ValueStack, type ManifestValue } from "@/components/story/ValueStack";
import { VisionSegment, type VisionLabels } from "@/components/story/VisionSegment";

interface ManifestStoryProps {
  mission: { title: string; sentence: string; icon: ReactNode };
  vision: { title: string; body: string; icon: ReactNode; labels: VisionLabels };
  /** In reading order: №1, Sifat, Innovatsiya, Xavfsizlik. */
  values: readonly ManifestValue[];
  closing: string;
}

/** One calm wave across the closing line's svg (viewBox 0 0 240 12). */
const WATER_LINE_PATH = "M2 6 q 14.75 -5 29.5 0 t 29.5 0 t 29.5 0 t 29.5 0 t 29.5 0 t 29.5 0 t 29.5 0 t 29.5 0";

/**
 * "Manifest" — the /company/mission-values scene (CLAUDE.md §14): typography
 * first, calm and confident. The mission is read like a statement
 * (MissionWords), the 2030 vision shown as a measurable goal (VisionSegment),
 * the values stacked like commitments (ValueStack), and a quiet closing line
 * under one drawn water line.
 *
 * DOM order is reading order and every word is in the server HTML at full
 * strength; motion only restates what the text already says.
 */
export function ManifestStory({ mission, vision, values, closing }: ManifestStoryProps) {
  return (
    <div className="space-y-12 sm:space-y-16">
      <MissionWords title={mission.title} sentence={mission.sentence} icon={mission.icon} />
      <VisionSegment title={vision.title} body={vision.body} icon={vision.icon} labels={vision.labels} />
      <ValueStack values={values} />

      {/* Also the stack's run-out: tall enough that the last value card can
          land on its sticky top before the page ends (viewport − its sticky
          top, its height, the gap and the page padding ≈ 22rem), so the stack
          plays out and then releases with the normal scroll. */}
      <div className="min-h-[calc(100vh-22rem)]">
        <svg
          aria-hidden="true"
          data-manifest-line="water"
          viewBox="0 0 240 12"
          className="block h-3 w-40 overflow-visible"
        >
          <DrawPath d={WATER_LINE_PATH} className="stroke-accent" strokeWidth={1.5} />
        </svg>
        <p className="mt-4 max-w-md text-[18px] font-medium leading-relaxed text-text-secondary">{closing}</p>
      </div>
    </div>
  );
}
