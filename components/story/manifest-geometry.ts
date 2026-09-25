import type { UseScrollOptions } from "framer-motion";

/**
 * Numbers of the "Manifest" scene (ManifestStory, /company/mission-values):
 * the mission read word by word, the 2030 vision as a small measurable figure,
 * the values stacked like commitments.
 *
 * Pure functions only — no React, no DOM — so the components, the server HTML
 * and the unit tests agree.
 */

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// ── Mission: word-by-word reading ─────────────────────────────────────────

/** Opacity of a word not read yet, and of a read one. */
export const WORD_OPACITY: [number, number] = [0.18, 1];

/** The sentence's scroll progress: 0 when its top reaches 85% of the viewport
 * height, 1 when its bottom is up at 55% — the sentence is lit through by the
 * time it sits in the upper half of the screen. */
export const MISSION_BEAT_OFFSET: UseScrollOptions["offset"] = ["start 0.85", "end 0.55"];

/** How many words are lighting up at the same time. More than one, so the
 * reading line moves as a soft front rather than word-sized steps. */
const WORDS_IN_FLIGHT = 3;

/** The words of a sentence, punctuation kept on its word. */
export function splitWords(sentence: string): string[] {
  return sentence.split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Where word `index` of `count` lights up over the sentence's progress: equal
 * windows, `WORDS_IN_FLIGHT` words wide, their starts spread evenly so the
 * first word starts at 0 and the last one ends at 1 — in reading order.
 */
export function wordRange(index: number, count: number): [number, number] {
  if (count <= 1) return [0, 1];
  const width = Math.min(1, WORDS_IN_FLIGHT / count);
  const start = (Math.min(Math.max(index, 0), count - 1) * (1 - width)) / (count - 1);
  return [start, start + width];
}

// ── Vision 2030: the figure ───────────────────────────────────────────────

/** "…eksport hajmini 3 barobar oshirish" — the copy's own number, the only
 * one the figure shows. Business copy, not data: kept next to the drawing it
 * sizes rather than parsed out of the sentence (CLAUDE.md §8). */
export const EXPORT_MULTIPLIER = 3;

/** "…har 3 ta yangi qurilgan uyda": one house of this many is ours. */
export const HOUSES_IN_ROW = 3;

/** Height of a bar as a share of the tallest, in percent (today = 1×). */
export function barHeightPercent(multiple: number, tallest: number = EXPORT_MULTIPLIER): number {
  if (!(tallest > 0)) return 0;
  return Math.round(clamp01(multiple / tallest) * 10000) / 100;
}

// ── Values: sticky stacking cards ─────────────────────────────────────────

/** The sticky TopBar's height (`h-14`), px. */
export const TOPBAR_HEIGHT = 56;

export type StackBreakpoint = "base" | "sm";

/** Clearance under the TopBar and the step between stacked card tops, px. */
const STACK_CLEARANCE: Readonly<Record<StackBreakpoint, number>> = { base: 12, sm: 24 };
const STACK_STEP: Readonly<Record<StackBreakpoint, number>> = { base: 8, sm: 14 };

/** Sticky `top` of card `index`: under the TopBar, each card a step lower so
 * the edges of the cards beneath stay in sight. */
export function stackTop(index: number, breakpoint: StackBreakpoint): number {
  return TOPBAR_HEIGHT + STACK_CLEARANCE[breakpoint] + Math.max(0, index) * STACK_STEP[breakpoint];
}

/**
 * `stackTop()` as Tailwind classes. Written out in full because Tailwind only
 * generates classes it can read in the source; tests/unit/story/manifest-geometry.test.ts
 * checks every entry against `stackTop()`.
 */
export const STACK_TOP_CLASSES: readonly string[] = [
  "top-[68px] sm:top-[80px]",
  "top-[76px] sm:top-[94px]",
  "top-[84px] sm:top-[108px]",
  "top-[92px] sm:top-[122px]",
  "top-[100px] sm:top-[136px]",
  "top-[108px] sm:top-[150px]",
];

/** The class for card `index`; cards past the table share its last step. */
export function stackTopClass(index: number): string {
  const last = STACK_TOP_CLASSES.length - 1;
  return STACK_TOP_CLASSES[Math.min(Math.max(index, 0), last)] ?? "";
}

/** A covered card shrinks towards its top edge and its content dims. */
export const COVERED_SCALE: [number, number] = [1, 0.96];
export const COVERED_OPACITY: [number, number] = [1, 0.6];

/** A card's measured box: its sticky `top` and its height, px. */
export interface StackCardBox {
  stickyTop: number;
  height: number;
}

/**
 * How far the next card has slid over a stuck card, 0 → 1.
 *
 * `nextTop` is the next card's top edge in the viewport (its in-flow
 * position; it may already be stuck, which only clamps the result at 1). The
 * cover starts when that edge reaches the stuck card's bottom and ends when
 * the next card lands on its own sticky top, so a card is at full size and
 * full strength for as long as nothing overlaps it — whatever the viewport
 * height and the card's height.
 */
export function coverProgress(nextTop: number, current: StackCardBox, nextStickyTop: number): number {
  const start = current.stickyTop + current.height;
  const distance = start - nextStickyTop;
  if (!(distance > 0)) return nextTop <= nextStickyTop ? 1 : 0;
  return clamp01((start - nextTop) / distance);
}
