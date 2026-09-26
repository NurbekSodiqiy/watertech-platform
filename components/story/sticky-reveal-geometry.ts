import type { UseScrollOptions } from "framer-motion";

/**
 * Scroll geometry of the "Sticky Scroll Reveal" scene (StickyRevealStory,
 * /company/about): a column of beats on the left, a sticky figure card on the
 * right that shows the active beat's illustration.
 *
 * Pure numbers only — no React — so the scene and the unit tests agree. Lengths
 * are fractions of the viewport height.
 */

/** Height of one chapter section ≥ lg. Must match `lg:min-h-[55vh]` in StickyRevealStory. */
export const BEAT_SECTION_VH = 0.55;

/** Height of the finale block ≥ lg. Must match `lg:min-h-[70vh]` in StickyRevealStory.
 * It is also the scene's run-out: at the end of the page its top has to have
 * climbed past READING_LINE, or the last beat could never become active. */
export const FINALE_VH = 0.7;

/**
 * The reading line: level with the middle of the sticky card (top-24, 4:3 —
 * about 35% of a 720px viewport). A chapter card is centred in its section,
 * so a section's top crossing this line is the moment the next chapter's card
 * becomes the one closest to the figure beside it.
 */
export const READING_LINE = 0.35;

/** Where the page ends: the list's end sits at least this high then (the page's
 * bottom padding is below it). Used to prove the last beat can be reached. */
export const LIST_END_AT_PAGE_END = 0.95;

/**
 * Offset of the beat progress over the whole beat list. The active beat is the
 * breakpoint `index / count` closest to the progress, so beat k + 1 takes over
 * at (k + ½) / count. Progress 0 puts the reading line half a section into the
 * list, and one progress unit spans `count` sections, so each switch lands
 * where a section's top meets the reading line:
 *
 * - start edge: READING_LINE − BEAT_SECTION_VH / 2 = 0.075;
 * - end edge: the list's end is FINALE_VH − BEAT_SECTION_VH further down than
 *   it would be with a section-sized finale, so 0.075 + 0.15 = 0.225.
 */
export const BEAT_OFFSET: UseScrollOptions["offset"] = ["start 0.075", "end 0.225"];

/**
 * Offset of the progress rail. The beat progress never reaches 1 (the page ends
 * first — about 0.74 there, past the last switch at 0.7), so the rail has its
 * own range: empty as the list's top reaches the beat start line, full when the
 * list's end reaches the bottom of the viewport, which is the end of the page.
 */
export const RAIL_OFFSET: UseScrollOptions["offset"] = ["start 0.075", "end end"];

/**
 * The beat whose breakpoint (`index / count`) is closest to `progress`,
 * clamped to 0 … count − 1. On a tie the earlier beat wins (the same reducer
 * as Aceternity's StickyScroll). Non-finite input, or no beats, gives 0.
 */
export function activeBeatIndex(progress: number, count: number): number {
  if (!Number.isFinite(progress) || !Number.isFinite(count) || count < 1) return 0;
  const beats = Math.floor(count);
  let closest = 0;
  for (let index = 1; index < beats; index += 1) {
    if (Math.abs(progress - index / beats) < Math.abs(progress - closest / beats)) closest = index;
  }
  return closest;
}
