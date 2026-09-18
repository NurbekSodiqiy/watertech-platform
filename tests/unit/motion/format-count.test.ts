import { describe, expect, it } from "vitest";
import { formatCount } from "@/lib/motion/format-count";

const NBSP = " ";

describe("formatCount", () => {
  it("groups thousands with a non-breaking space", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(12500)).toBe(`12${NBSP}500`);
    expect(formatCount(1234567)).toBe(`1${NBSP}234${NBSP}567`);
  });

  it("uses a comma before a fixed number of decimals", () => {
    expect(formatCount(98.5, 1)).toBe("98,5");
    expect(formatCount(3, 2)).toBe("3,00");
    expect(formatCount(12500.456, 2)).toBe(`12${NBSP}500,46`);
  });

  it("rounds intermediate animation frames to the requested precision", () => {
    expect(formatCount(29.137, 1)).toBe("29,1");
    expect(formatCount(4999.6)).toBe(`5${NBSP}000`);
  });

  it("handles signs without a negative zero", () => {
    expect(formatCount(-1500)).toBe(`-1${NBSP}500`);
    expect(formatCount(-0.04, 1)).toBe("0,0");
  });

  it("returns an empty string for non-finite input and clamps decimals", () => {
    expect(formatCount(Number.NaN)).toBe("");
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe("");
    expect(formatCount(1.5, -2)).toBe("2");
  });
});
