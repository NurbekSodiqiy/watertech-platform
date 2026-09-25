import { describe, expect, it } from "vitest";
import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";
import {
  barHeightPercent,
  COVERED_OPACITY,
  COVERED_SCALE,
  coverProgress,
  EXPORT_MULTIPLIER,
  HOUSES_IN_ROW,
  splitWords,
  STACK_TOP_CLASSES,
  stackTop,
  stackTopClass,
  TOPBAR_HEIGHT,
  WORD_OPACITY,
  wordRange,
} from "@/components/story/manifest-geometry";

const MISSIONS = {
  uz: uz.pages.company.missionValues.chapters.missiya.body,
  ru: ru.pages.company.missionValues.chapters.missiya.body,
};

// The values stacked on /company/mission-values (app/[locale]/(app)/company/mission-values/page.tsx).
const VALUE_COUNT = 4;

describe("mission words", () => {
  it("splits the sentence into its words, punctuation kept, nothing lost", () => {
    for (const sentence of Object.values(MISSIONS)) {
      const words = splitWords(sentence);
      expect(words.join(" ")).toBe(sentence.trim().replace(/\s+/g, " "));
      expect(words.every((word) => word.length > 0 && !/\s/.test(word))).toBe(true);
    }
    expect(splitWords("  a   b\tc ")).toEqual(["a", "b", "c"]);
    expect(splitWords("")).toEqual([]);
  });

  it("lights the words in reading order over the whole beat", () => {
    for (const sentence of Object.values(MISSIONS)) {
      const count = splitWords(sentence).length;
      const ranges = Array.from({ length: count }, (_, index) => wordRange(index, count));
      expect(ranges[0][0]).toBe(0);
      expect(ranges[count - 1][1]).toBeCloseTo(1, 10);
      for (const [start, end] of ranges) {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(1 + 1e-9);
        expect(end).toBeGreaterThan(start);
      }
      for (let index = 1; index < count; index += 1) {
        expect(ranges[index][0]).toBeGreaterThan(ranges[index - 1][0]);
        expect(ranges[index][1]).toBeGreaterThan(ranges[index - 1][1]);
      }
    }
  });

  it("handles a one-word sentence and out-of-range indices", () => {
    expect(wordRange(0, 1)).toEqual([0, 1]);
    expect(wordRange(0, 0)).toEqual([0, 1]);
    expect(wordRange(-3, 10)).toEqual(wordRange(0, 10));
    expect(wordRange(42, 10)).toEqual(wordRange(9, 10));
  });

  it("dims unread words without hiding them", () => {
    expect(WORD_OPACITY[0]).toBeGreaterThan(0);
    expect(WORD_OPACITY[0]).toBeLessThan(0.3);
    expect(WORD_OPACITY[1]).toBe(1);
  });
});

describe("vision figure", () => {
  it("shows only the copy's own numbers", () => {
    expect(uz.pages.company.missionValues.chapters.vizyon2030.body).toContain(`${EXPORT_MULTIPLIER} barobar`);
    expect(uz.pages.company.missionValues.chapters.vizyon2030.body).toContain(`har ${HOUSES_IN_ROW} ta`);
    expect(uz.pages.company.missionValues.vision.houses).toContain(`${HOUSES_IN_ROW} ta`);
  });

  it("sizes today's bar as a third of the 2030 bar", () => {
    expect(barHeightPercent(EXPORT_MULTIPLIER)).toBe(100);
    expect(barHeightPercent(1)).toBeCloseTo(100 / EXPORT_MULTIPLIER, 1);
    expect(barHeightPercent(5)).toBe(100);
    expect(barHeightPercent(-1)).toBe(0);
    expect(barHeightPercent(1, 0)).toBe(0);
  });
});

describe("value stack", () => {
  it("pins every card under the 56px TopBar, each a step lower", () => {
    expect(TOPBAR_HEIGHT).toBe(56);
    expect(stackTop(0, "sm")).toBe(56 + 24);
    expect(stackTop(3, "sm")).toBe(56 + 24 + 3 * 14);
    expect(stackTop(0, "base")).toBeGreaterThan(TOPBAR_HEIGHT);
    for (let index = 1; index < VALUE_COUNT; index += 1) {
      expect(stackTop(index, "base")).toBeGreaterThan(stackTop(index - 1, "base"));
      expect(stackTop(index, "sm") - stackTop(index - 1, "sm")).toBeGreaterThan(
        stackTop(index, "base") - stackTop(index - 1, "base")
      );
    }
  });

  it("writes stackTop() out as full Tailwind classes, one per card", () => {
    expect(STACK_TOP_CLASSES.length).toBeGreaterThanOrEqual(VALUE_COUNT);
    STACK_TOP_CLASSES.forEach((classes, index) => {
      expect(classes).toBe(`top-[${stackTop(index, "base")}px] sm:top-[${stackTop(index, "sm")}px]`);
    });
    expect(stackTopClass(-1)).toBe(STACK_TOP_CLASSES[0]);
    expect(stackTopClass(99)).toBe(STACK_TOP_CLASSES[STACK_TOP_CLASSES.length - 1]);
  });

  it("covers a card only while the next one overlaps it", () => {
    const current = { stickyTop: 80, height: 180 };
    const nextStickyTop = 94;
    // Below the stuck card's bottom edge: untouched.
    expect(coverProgress(700, current, nextStickyTop)).toBe(0);
    expect(coverProgress(260, current, nextStickyTop)).toBe(0);
    // Halfway between that edge and its own landing line.
    expect(coverProgress(177, current, nextStickyTop)).toBeCloseTo(0.5, 10);
    // Landed (or stuck and still being scrolled past).
    expect(coverProgress(94, current, nextStickyTop)).toBe(1);
    expect(coverProgress(-400, current, nextStickyTop)).toBe(1);
  });

  it("never divides by zero for a card no taller than the step", () => {
    expect(coverProgress(100, { stickyTop: 80, height: 10 }, 94)).toBe(0);
    expect(coverProgress(90, { stickyTop: 80, height: 10 }, 94)).toBe(1);
  });

  it("shrinks and dims a covered card only slightly", () => {
    expect(COVERED_SCALE).toEqual([1, 0.96]);
    expect(COVERED_OPACITY).toEqual([1, 0.6]);
  });
});
