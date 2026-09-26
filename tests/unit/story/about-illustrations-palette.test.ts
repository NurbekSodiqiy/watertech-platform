import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The /company/about illustrations may use the site's two-colour palette only
 * (CLAUDE.md §6, the components/story exception): `stroke-accent`, and
 * `stroke-primary-light` / `fill-primary-light/…`. The source is read as text,
 * so a forbidden colour fails here even if it never renders in a test.
 */

const SOURCE = readFileSync(resolve(__dirname, "../../../components/story/about-illustrations.tsx"), "utf8");

const FORBIDDEN: readonly (readonly [string, RegExp])[] = [
  ["a # colour literal", /#[0-9a-fA-F]{3,8}\b/],
  ["rgb()", /rgba?\(/],
  ["hsl()", /hsla?\(/],
  ["<text>", /<text/],
  ["a gradient", /Gradient/],
  ["a filter", /filter/],
  ["a raster <image>", /<image/],
  ["text-white", /text-white/],
  ["bg-white", /bg-white/],
  ["fill-white", /fill-white/],
  ["stroke-white", /stroke-white/],
  [
    "a Tailwind default palette class",
    /-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/,
  ],
];

describe("about illustrations palette", () => {
  it("reads the source", () => {
    expect(SOURCE).toContain("export function AboutFactoryIllustration");
  });

  for (const [label, pattern] of FORBIDDEN) {
    it(`has no ${label}`, () => {
      const hit = SOURCE.split("\n").findIndex((line) => pattern.test(line));
      expect(hit === -1 ? null : `line ${hit + 1}: ${SOURCE.split("\n")[hit].trim()}`).toBeNull();
    });
  }

  it("colours only with the two palette tokens", () => {
    const colourClasses = SOURCE.match(/\b(?:stroke|fill|text|bg)-[a-z][\w/-]*/g) ?? [];
    const allowed = /^(?:stroke-accent|stroke-primary-light|fill-primary-light\/(?:10|15|20))$/;
    // `stroke-linecap` style props are attributes, not classes; only class tokens are checked.
    const offenders = colourClasses.filter((token) => !allowed.test(token) && !/^(?:stroke|fill)-(?:none|linecap|linejoin|width)/.test(token));
    expect(offenders).toEqual([]);
  });

  it("marks every drawing decorative", () => {
    expect(SOURCE).toContain('aria-hidden="true"');
    expect(SOURCE).toContain('focusable="false"');
    expect(SOURCE.match(/<svg\b/g)).toHaveLength(1);
  });
});
