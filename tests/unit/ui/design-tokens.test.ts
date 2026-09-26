import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Guards two accessibility facts of the design system (CLAUDE.md §6, docs/AUDIT.md
// "R3 release audit"): the admin chart fills keep ≥ 3:1 against the surfaces they
// sit on, in both themes, and no focus ring is drawn in the colour of the fill it
// sits on (an inset `ring-primary` on `bg-accent` is invisible — both are --accent).

const ROOT = path.resolve(__dirname, "../../..");
const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

type Rgb = readonly [number, number, number];

function tokens(selector: ":root" | ".dark"): Record<string, Rgb> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`${selector} block missing from app/globals.css`);
  const block = css.slice(start, css.indexOf("}", start));
  const out: Record<string, Rgb> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)) {
    out[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  return out;
}

function luminance([r, g, b]: Rgb): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = tokens(":root");
const themes = { light, dark: { ...light, ...tokens(".dark") } } as const;

describe("chart tokens (WCAG 1.4.11, ≥ 3:1)", () => {
  for (const [theme, palette] of Object.entries(themes)) {
    for (const fill of ["chart-green", "chart-blue"] as const) {
      for (const surface of ["surface", "surface-alt"] as const) {
        it(`${theme}: --${fill} on --${surface}`, () => {
          const fg = palette[fill];
          const bg = palette[surface];
          expect(fg, `--${fill}`).toBeDefined();
          expect(bg, `--${surface}`).toBeDefined();
          if (!fg || !bg) return;
          expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
        });
      }
    }
  }
});

/** `fg` at `alpha` over `bg`, as the browser composites bg-x/15 onto a surface. */
function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  const mix = (i: 0 | 1 | 2): number => Math.round(fg[i] * alpha + bg[i] * (1 - alpha));
  return [mix(0), mix(1), mix(2)];
}

// The danger button of ConfirmDialog and the danger zone (person removal, 0022):
// text-primary-dark on bg-status-outdated/15 (hover /25) over the surface, with
// a solid status-outdated border. White on the solid fill was 3.71:1 in the
// light theme — below AA for 13px text (docs/AUDIT.md §3).
describe("danger action (WCAG 1.4.3 text ≥ 4.5:1, 1.4.11 edge ≥ 3:1)", () => {
  for (const [theme, palette] of Object.entries(themes)) {
    const danger = palette["status-outdated"];
    const surface = palette.surface;
    const text = palette["text-primary"];

    for (const alpha of [0.15, 0.25]) {
      it(`${theme}: text-primary on status-outdated/${alpha * 100} over surface`, () => {
        expect(danger && surface && text, "--status-outdated / --surface / --text-primary").toBeTruthy();
        if (!danger || !surface || !text) return;
        expect(contrast(text, over(danger, alpha, surface))).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${theme}: the status-outdated border against surface`, () => {
      if (!danger || !surface) throw new Error("--status-outdated / --surface missing");
      expect(contrast(danger, surface)).toBeGreaterThanOrEqual(3);
    });
  }
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

describe("focus rings", () => {
  it("never draws an inset primary ring on a solid accent/primary fill", () => {
    const offenders: string[] = [];
    for (const file of [...sourceFiles(path.join(ROOT, "components")), ...sourceFiles(path.join(ROOT, "app"))]) {
      const source = readFileSync(file, "utf8");
      for (const literal of source.match(/"[^"\n]*"|`[^`]*`/g) ?? []) {
        const classes = literal.split(/[\s"`]+/);
        const solidFill = classes.some((c) => c === "bg-accent" || c === "bg-primary");
        const insetSameColour =
          classes.includes("focus-visible:ring-inset") &&
          classes.some((c) => c === "focus-visible:ring-primary" || c === "focus-visible:ring-accent");
        if (solidFill && insetSameColour) offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
