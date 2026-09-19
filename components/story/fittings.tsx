import type { ReactNode } from "react";

/**
 * Line-art glyphs for the pipeline scene, drawn in the same hand as the inline
 * icons on /company/mission-values: 48×48 viewBox, 1.5 stroke, round caps and
 * joins, currentColor (so `text-*` classes colour them in both themes).
 * Strokes do not scale, so a glyph keeps its 1.5px line at any rendered size.
 * The main pipe runs vertically through each fitting.
 */

export type FittingKind = "coupling" | "elbow" | "tee" | "valve";
export type PipelineGlyphKind = FittingKind | "tank";

/** Tank body outline; also the clip for its water. */
export const TANK_BODY_PATH = "M9 18 Q9 12 24 12 Q39 12 39 18 V41 Q39 43 37 43 H11 Q9 43 9 41 Z";

/** Where the main pipe enters the tank: the top of its filler neck. */
export const TANK_INLET: { readonly x: number; readonly y: number } = { x: 24, y: 6 };

/** The water volume at full level, clipped by TANK_BODY_PATH. */
export const TANK_WATER: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } = {
  x: 9,
  y: 17,
  width: 30,
  height: 26,
};

/** Size of the glyph viewBox, for converting glyph units to px. */
export const GLYPH_SIZE = 48;

// vector-effect is not inherited, so it goes on every shape rather than the group.
const STROKE = { vectorEffect: "non-scaling-stroke" } as const;

const GLYPHS: Record<PipelineGlyphKind, ReactNode> = {
  // Sleeve over two pipe ends, with the centre stop.
  coupling: (
    <>
      <rect {...STROKE} x="17" y="15" width="14" height="18" rx="2" />
      <path {...STROKE} d="M20 9 V15 M28 9 V15 M20 33 V39 M28 33 V39" />
      <path {...STROKE} d="M17 24 H31" />
    </>
  ),
  // Run from above turning to the right, with socket rims at both ends.
  elbow: (
    <>
      <path {...STROKE} d="M15 11 V21 A12 12 0 0 0 27 33 H37" />
      <path {...STROKE} d="M23 11 V21 A4 4 0 0 0 27 25 H37" />
      <path {...STROKE} d="M13 13 H25 M35 23 V35" />
    </>
  ),
  // Straight run with a side outlet.
  tee: (
    <>
      <path {...STROKE} d="M16 10 V38" />
      <path {...STROKE} d="M24 10 V20 H36 M24 38 V28 H36" />
      <path {...STROKE} d="M14 12 H26 M14 36 H26 M34 18 V30" />
    </>
  ),
  // Ball valve symbol on a vertical run, with its lever.
  valve: (
    <>
      <path {...STROKE} d="M16 12 H32 L16 36 H32 Z" />
      <path {...STROKE} d="M24 24 H35 M35 20 V28" />
    </>
  ),
  // Ribbed polyethylene tank with a filler neck.
  tank: (
    <>
      <path {...STROKE} d={TANK_BODY_PATH} />
      <path {...STROKE} d="M20 12 V6 H28 V12" />
      <path {...STROKE} d="M9 25 H39 M9 34 H39" />
    </>
  ),
};

export function FittingGlyph({ kind, className = "" }: { kind: PipelineGlyphKind; className?: string }) {
  return (
    <svg viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`} aria-hidden="true" className={className}>
      <g
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[kind]}
      </g>
    </svg>
  );
}
