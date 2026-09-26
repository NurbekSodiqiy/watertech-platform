import { m, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { durations, noTransition, tween } from "@/lib/motion/tokens";

/**
 * The five line-art illustrations of StickyRevealStory (/company/about), one
 * per beat. The single file that holds several components (CLAUDE.md §2): a
 * set of pure SVG drawings sharing one style and one set of shape helpers.
 *
 * Style: viewBox 480 × 360, 1.75px non-scaling strokes with round caps and
 * joins, two colours — `stroke-accent` for the main strokes, `stroke-primary-light`
 * and `fill-primary-light/10…/20` for the secondary ones. People are simple
 * figures on one skeleton (`Person`): 116 units from feet to crown, no faces.
 * Every drawing is decorative (aria-hidden); the chapter text says it all.
 *
 * `draw="animate"`: the main strokes render as `m.path` and follow the
 * `undrawn` / `drawn` variant labels of the nearest motion ancestor (the
 * scene's draw wrapper), so they draw once when it switches. `draw="static"`
 * (the default) is plain SVG — the server HTML and reduced motion.
 */

export type IllustrationDraw = "static" | "animate";

export interface AboutIllustrationProps {
  className?: string;
  draw?: IllustrationDraw;
}

/** The variant labels an animated illustration's parent switches between. */
export type IllustrationDrawState = "undrawn" | "drawn";

const STROKE_VARIANTS: Variants = {
  // Opacity hides the round-cap dot a zero-length stroke would leave.
  undrawn: { pathLength: 0, opacity: 0, transition: noTransition },
  drawn: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: tween(durations.slow), opacity: { duration: durations.instant } },
  },
};

const LINE = {
  fill: "none",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

// ——— Shape helpers (path data in viewBox units) ———

function n(value: number): number {
  return Math.round(value * 10) / 10;
}

function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0`;
}

function rrect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

/** Closed polygon through points at alternating radii (gear teeth, rosette). */
function radial(cx: number, cy: number, radii: readonly number[], steps: number, turn = 0): string {
  const points = Array.from({ length: steps }, (_, index) => {
    const angle = ((index / steps + turn) * 2 * Math.PI) - Math.PI / 2;
    const r = radii[index % radii.length];
    return `${n(cx + r * Math.cos(angle))} ${n(cy + r * Math.sin(angle))}`;
  });
  return `M${points.join("L")}Z`;
}

/** A water drop, tip up, centred on its round part. */
function drop(x: number, y: number): string {
  return `M${x} ${y - 9}C${x + 2} ${y - 5} ${x + 5} ${y - 2} ${x + 5} ${y + 1}A5 5 0 0 1 ${x - 5} ${y + 1}C${x - 5} ${y - 2} ${x - 2} ${y - 5} ${x} ${y - 9}Z`;
}

// ——— Primitives ———

interface PathProps {
  d: string;
  draw: IllustrationDraw;
}

/** A main stroke (colour 1): the only part that draws itself. */
function Stroke({ d, draw }: PathProps) {
  return draw === "animate" ? (
    <m.path d={d} {...LINE} className="stroke-accent" variants={STROKE_VARIANTS} />
  ) : (
    <path d={d} {...LINE} className="stroke-accent" />
  );
}

/** A secondary stroke (colour 2). */
function Line({ d }: { d: string }) {
  return <path d={d} {...LINE} className="stroke-primary-light" />;
}

/** A flat fill (colour 2, light). */
function Fill({ d, strong = false }: { d: string; strong?: boolean }) {
  return <path d={d} className={strong ? "fill-primary-light/20" : "fill-primary-light/10"} />;
}

function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 480 360" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** Elbow x, y, then hand x, y. */
type Arm = readonly [number, number, number, number];

interface PersonProps {
  /** Centre line of the body. */
  cx: number;
  /** Ground line (the feet). */
  g: number;
  /** The arm on the viewer's left, then on the viewer's right. */
  arms: readonly [Arm, Arm];
  wear?: "hardhat" | "cap" | "headset";
  draw: IllustrationDraw;
}

/** An arm hanging at the side, for a figure at (cx, g). */
function restingArm(cx: number, g: number, side: -1 | 1): Arm {
  return [cx + side * 18, g - 62, cx + side * 19, g - 42];
}

/**
 * One figure, the same skeleton everywhere: crown at g − 115, shoulders at
 * g − 84, hips at g − 50. A hat hides the top of the head, so the head is
 * drawn only below the brim then.
 */
function Person({ cx, g, arms, wear, draw }: PersonProps) {
  const hy = g - 104;
  const brim = wear === "cap" ? g - 107 : g - 106;
  const head =
    wear === "hardhat" || wear === "cap"
      ? `M${n(cx - Math.sqrt(121 - (hy - brim) ** 2))} ${brim}A11 11 0 1 0 ${n(cx + Math.sqrt(121 - (hy - brim) ** 2))} ${brim}`
      : circle(cx, hy, 11);
  const torso = `M${cx - 12} ${g - 48}L${cx - 15} ${g - 78}Q${cx - 15} ${g - 88} ${cx - 6} ${g - 88}H${cx + 6}Q${cx + 15} ${g - 88} ${cx + 15} ${g - 78}L${cx + 12} ${g - 48}Z`;
  const [left, right] = arms;
  const limbs =
    `M${cx - 6} ${g - 48}L${cx - 8} ${g}H${cx - 14}M${cx + 6} ${g - 48}L${cx + 8} ${g}H${cx + 14}` +
    `M${cx - 14} ${g - 84}L${left[0]} ${left[1]}L${left[2]} ${left[3]}` +
    `M${cx + 14} ${g - 84}L${right[0]} ${right[1]}L${right[2]} ${right[3]}`;

  return (
    <g>
      <Fill d={torso} />
      {wear === "hardhat" && (
        <>
          <Fill d={`M${cx - 13} ${brim}A13 13 0 0 1 ${cx + 13} ${brim}Z`} strong />
          <Stroke d={`M${cx - 17} ${brim}H${cx + 17}M${cx - 13} ${brim}A13 13 0 0 1 ${cx + 13} ${brim}`} draw={draw} />
          <Line d={`M${cx} ${brim - 13}V${brim - 6}`} />
        </>
      )}
      {wear === "cap" && (
        <>
          <Fill d={`M${cx - 11} ${brim}Q${cx - 11} ${brim - 12} ${cx} ${brim - 12}Q${cx + 11} ${brim - 12} ${cx + 11} ${brim}Z`} strong />
          <Stroke
            d={`M${cx - 11} ${brim}Q${cx - 11} ${brim - 12} ${cx} ${brim - 12}Q${cx + 11} ${brim - 12} ${cx + 11} ${brim}H${cx + 22}`}
            draw={draw}
          />
        </>
      )}
      {wear === "headset" && (
        <>
          <Fill d={`${rrect(cx - 16, hy - 5, 5, 11, 2)}${rrect(cx + 11, hy - 5, 5, 11, 2)}`} strong />
          <Line d={`${rrect(cx - 16, hy - 5, 5, 11, 2)}${rrect(cx + 11, hy - 5, 5, 11, 2)}M${cx - 14} ${hy + 6}Q${cx - 13} ${hy + 13} ${cx - 5} ${hy + 12}`} />
          <Stroke d={`M${cx - 13.5} ${hy - 4}A13.5 13.5 0 0 1 ${cx + 13.5} ${hy - 4}`} draw={draw} />
        </>
      )}
      <Stroke d={head} draw={draw} />
      <Stroke d={torso} draw={draw} />
      <Stroke d={limbs} draw={draw} />
    </g>
  );
}

// ——— 1. about: the factory, since 2021, German technology ———

const PIPE_STACK: readonly (readonly [number, number])[] = [
  [424, 303],
  [442, 303],
  [460, 303],
  [433, 287.4],
  [451, 287.4],
  [442, 271.8],
];
const FACTORY_ROOF = "M176 132L234 172H176ZM234 132L292 172H234ZM292 132L350 172H292ZM350 132L408 172H350Z";
const BLUEPRINT = "M71.8 287.9L89.8 233.9A6.5 6.5 0 0 1 102.2 238.1L84.2 292.1A6.5 6.5 0 0 1 71.8 287.9Z";

/** A modern plant with a saw-tooth roof and a roller gate, a gear emblem on
 * the facade (German engineering), a stack of finished pipe by the gate, and
 * two staff in hard hats: an engineer with a rolled blueprint, and a
 * colleague pointing at the building. */
export function AboutFactoryIllustration({ className, draw = "static" }: AboutIllustrationProps) {
  const g = 312;
  return (
    <Frame className={className}>
      <Line d="M50 96H112A12 12 0 0 0 100 76A15 15 0 0 0 72 72A11 11 0 0 0 56 84A6 6 0 0 0 50 96Z" />
      <Line d="M24 312H456" />
      <Fill d={FACTORY_ROOF} />
      <Stroke d="M176 312V132L234 172V132L292 172V132L350 172V132L408 172V312" draw={draw} />
      <Line d="M176 172H408M176 194H408" />
      {/* Emblem: a gear in a ring. */}
      <Fill d={circle(214, 234, 22)} />
      <Line d={circle(214, 234, 22)} />
      <Stroke d={radial(214, 234, [10.5, 14.5, 14.5, 10.5], 32, -1 / 64)} draw={draw} />
      <Stroke d={circle(214, 234, 4)} draw={draw} />
      {/* Windows and the roller gate. */}
      <Fill d={`${rrect(252, 212, 28, 28, 2)}${rrect(290, 212, 28, 28, 2)}`} />
      <Line d={`${rrect(252, 212, 28, 28, 2)}${rrect(290, 212, 28, 28, 2)}M266 212V240M304 212V240`} />
      <Stroke d="M332 312V248H396V312" draw={draw} />
      <Line d="M338 260H390M338 272H390M338 284H390M338 296H390" />
      {/* Finished pipe, stacked by the gate. */}
      <Fill d={PIPE_STACK.map(([x, y]) => circle(x, y, 9)).join("")} strong />
      <Stroke d={PIPE_STACK.map(([x, y]) => circle(x, y, 9)).join("")} draw={draw} />
      <Line d={PIPE_STACK.map(([x, y]) => circle(x, y, 4.5)).join("")} />
      {/* The engineer (rolled blueprint) and a colleague pointing at the plant. */}
      <Fill d={BLUEPRINT} strong />
      <Person cx={62} g={g} wear="hardhat" draw={draw} arms={[restingArm(62, g, -1), [81, 248, 84, 266]]} />
      <Stroke d={BLUEPRINT} draw={draw} />
      <Line d="M96 236a3 3 0 1 0 -2.4 2.8M75.6 276.6L87.9 280.7" />
      <Person cx={128} g={g} wear="hardhat" draw={draw} arms={[restingArm(128, g, -1), [154, 214, 166, 198]]} />
    </Frame>
  );
}

// ——— 2. production: polypropylene raw material on an extrusion line ———

const GRANULES: readonly (readonly [number, number])[] = [
  [52, 80], [62, 80], [72, 80], [82, 80], [92, 80], [102, 80],
  [57, 90], [67, 90], [77, 90], [87, 90], [97, 90],
  [62, 100], [72, 100], [82, 100], [92, 100],
  [67, 110], [77, 110], [87, 110],
  [72, 119], [82, 119],
];
const HEATER_BANDS = [100, 136, 172, 208].map((x) => rrect(x, 145, 16, 40, 3)).join("");

/** Left to right: a hopper of PP granules, the extruder barrel with heater
 * bands, the die head, the cooling bath and the finished pipe on rollers; an
 * operator in a hard hat at the line's control panel. */
export function AboutExtrusionIllustration({ className, draw = "static" }: AboutIllustrationProps) {
  const g = 312;
  return (
    <Frame className={className}>
      <Line d="M24 312H456" />
      {/* Hopper with granules, drive, barrel, heater bands, die. */}
      <Fill d="M40 66H112L86 126H66Z" />
      <Fill d={GRANULES.map(([x, y]) => circle(x, y, 2.6)).join("")} strong />
      <Line d={GRANULES.map(([x, y]) => circle(x, y, 2.6)).join("")} />
      <Stroke d="M66 150V126L40 66H112L86 126V150" draw={draw} />
      <Line d={`${rrect(22, 146, 22, 38, 3)}M72 180V312M256 180V312M293 192V312M60 312H84M244 312H268`} />
      <Stroke d={rrect(44, 150, 238, 30, 6)} draw={draw} />
      <Fill d={HEATER_BANDS} strong />
      <Line d={HEATER_BANDS} />
      <Stroke d={rrect(282, 138, 22, 54, 4)} draw={draw} />
      {/* Cooling bath, then the pipe on rollers. */}
      <Fill d="M320 154H400V204H320Z" />
      <Line d="M324 154q6 -4 12 0t12 0t12 0t12 0t12 0t12 0M326 206V312M394 206V312M422 185V312M450 185V312M422 250H450" />
      <Stroke d="M318 146V200Q318 206 324 206H396Q402 206 402 200V146" draw={draw} />
      <Fill d="M304 158H464V172H304Z" strong />
      <Stroke d={`M304 158H464M304 172H464M464 158a4 7 0 0 1 0 14a4 7 0 0 1 0 -14${circle(422, 179, 6)}${circle(450, 179, 6)}`} draw={draw} />
      <Line d="M464 161.5a2 3.5 0 0 1 0 7a2 3.5 0 0 1 0 -7M410 165H456" />
      {/* Control panel with its screen, and the operator. */}
      <Fill d="M144 242H174L176 256H142Z" strong />
      <Line d={`M144 242H174L176 256H142ZM147 252l6 -4l5 2l6 -6l6 3${circle(152, 278, 3)}${circle(164, 278, 3)}M150 292H168`} />
      <Stroke d="M140 312V262H178V312M132 262L138 236H180L186 262Z" draw={draw} />
      <Person cx={222} g={g} wear="hardhat" draw={draw} arms={[[196, 244, 184, 250], restingArm(222, g, 1)]} />
    </Frame>
  );
}

// ——— 3. goal: tested against technical and international standards ———

const SAMPLES: readonly (readonly [number, number])[] = [
  [74, 72],
  [98, 80],
  [122, 66],
  [146, 76],
];

const GAUGE_TICKS = [-120, -60, 0, 60, 120]
  .map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const [s, c] = [Math.sin(rad), Math.cos(rad)];
    return `M${n(167 + 16 * s)} ${n(154 - 16 * c)}L${n(167 + 20 * s)} ${n(154 - 20 * c)}`;
  })
  .join("");

/** A lab bench with a hydrostatic pressure test: a pipe segment clamped
 * between end caps, a pressure gauge, a hose to the hand pump; on the wall a
 * clipboard with three ticks and a certification seal; a technician in a hard
 * hat at the rig. */
export function AboutQualityLabIllustration({ className, draw = "static" }: AboutIllustrationProps) {
  const g = 312;
  return (
    <Frame className={className}>
      <Line d="M24 312H456" />
      {/* A shelf of pipe samples waiting for their test. */}
      <Fill d={SAMPLES.map(([x, y]) => rrect(x, y, 16, 100 - y, 2)).join("")} />
      <Line d={`M56 100H176M68 100l8 8M164 100l-8 8${SAMPLES.map(([x, y]) => `${rrect(x, y, 16, 100 - y, 2)}M${x} ${y + 4}H${x + 16}`).join("")}`} />
      {/* Bench, legs and cabinet. */}
      <Stroke d={rrect(128, 240, 324, 10, 2)} draw={draw} />
      <Line d={`M140 250V312M440 250V312${rrect(300, 256, 120, 50, 3)}M350 272H370`} />
      {/* The rig: pipe between end caps, gauge on top, hose to the pump. */}
      <Fill d="M174 206H330V222H174Z" strong />
      <Line d={`M182 214H322${rrect(156, 232, 22, 8, 2)}${rrect(326, 232, 22, 8, 2)}${circle(167, 203, 2)}${circle(167, 225, 2)}${circle(337, 203, 2)}${circle(337, 225, 2)}`} />
      <Stroke d={`${rrect(160, 196, 14, 36, 3)}${rrect(330, 196, 14, 36, 3)}M174 206H330M174 222H330`} draw={draw} />
      <Fill d={circle(167, 154, 22)} />
      <Line d={GAUGE_TICKS} />
      <Stroke d={`M167 196V176${circle(167, 154, 22)}M167 154L178 143`} draw={draw} />
      <Stroke d={`M344 214C366 214 364 226 386 226${rrect(386, 204, 50, 36, 4)}`} draw={draw} />
      <Line d={`${circle(411, 222, 7)}M411 222l4 -4M411 204V188M401 188H421`} />
      {/* Clipboard with three ticks, and the certification seal. */}
      <Fill d={rrect(292, 56, 58, 74, 4)} />
      <Fill d={rrect(309, 50, 24, 10, 3)} strong />
      <Line d={`${rrect(309, 50, 24, 10, 3)}M320 76H340M320 96H340M320 116H340`} />
      <Stroke d={`${rrect(292, 56, 58, 74, 4)}M302 76l4 4l8 -8M302 96l4 4l8 -8M302 116l4 4l8 -8`} draw={draw} />
      <Line d="M398 112L391 141L398 136L403 144L409 116M418 112L425 141L418 136L413 144L407 116" />
      <Fill d={radial(408, 92, [24, 20.5], 32)} strong />
      <Line d={circle(408, 92, 15)} />
      <Stroke d={`${radial(408, 92, [24, 20.5], 32)}M400 92l6 6l11 -12`} draw={draw} />
      <Person cx={100} g={g} wear="hardhat" draw={draw} arms={[restingArm(100, g, -1), [134, 240, 156, 222]]} />
    </Frame>
  );
}

// ——— 4. whyUs: partnership, the optimal solution per project ———

const TUB = "M350 208H422V214Q422 226 410 226H362Q350 226 350 214Z";

/** A WaterTech sales operator (headset) shaking hands with an installer (cap,
 * tool bag), a speech bubble with a tick above them; behind, a house in
 * cross-section with its pipe network — supply lines in colour 1, drain and
 * vent in colour 2. */
export function AboutPartnershipIllustration({ className, draw = "static" }: AboutIllustrationProps) {
  const g = 312;
  return (
    <Frame className={className}>
      <Line d="M24 312H456" />
      {/* The house, its fixtures, the drain stack and vent. */}
      <Stroke d="M244 312V160L348 84L452 160V312" draw={draw} />
      <Fill d={TUB} />
      <Line d={`M244 228H452${TUB}M292 272H352M300 272V282Q300 288 306 288H334Q340 288 340 282V272`} />
      <Line d="M436 134V312M390 226V236H436M320 288V298H436M380 182H396L392 188H384ZM384 194V200M388 194V202M392 194V198" />
      {/* Supply: from the street, up the riser, to the sink and the bath. */}
      <Stroke d={`M270 312V172H380Q388 172 388 180V182M270 250H316Q322 250 322 256V262${circle(270, 292, 5)}`} draw={draw} />
      {/* The installer's tool bag. */}
      <Fill d={rrect(174, 278, 32, 24, 4)} strong />
      <Line d="M182 280Q190 256 198 280M174 287H206" />
      <Stroke d={rrect(174, 278, 32, 24, 4)} draw={draw} />
      <Person cx={96} g={g} wear="headset" draw={draw} arms={[restingArm(96, g, -1), [120, 246, 131, 250]]} />
      <Person cx={170} g={g} wear="cap" draw={draw} arms={[[146, 246, 135, 250], [188, 250, 190, 268]]} />
      <Fill d="M126 250a7 5 0 1 0 14 0a7 5 0 1 0 -14 0" strong />
      <Line d="M126 250a7 5 0 1 0 14 0a7 5 0 1 0 -14 0" />
      {/* Agreement. */}
      <Fill d="M116 104H152Q164 104 164 116V132Q164 144 152 144H138L124 158L126 144H116Q104 144 104 132V116Q104 104 116 104Z" />
      <Stroke
        d="M116 104H152Q164 104 164 116V132Q164 144 152 144H138L124 158L126 144H116Q104 144 104 132V116Q104 104 116 104ZM122 124l7 7l14 -14"
        draw={draw}
      />
    </Frame>
  );
}

// ——— 5. finale: water is the source of life ———

const GLASS_WATER = "M318.4 262L322 304Q323 308 327 308H367Q371 308 372 304L375.6 262Z";

/** A PP-R pipe run up from the floor, along the wall and down to a tap; the
 * stream and a few drops fall into a glass; ripples spread on the counter,
 * where a sprout grows. */
export function AboutWaterIllustration({ className, draw = "static" }: AboutIllustrationProps) {
  return (
    <Frame className={className}>
      <Line d="M40 308H452M296 318q51 10 102 0M276 328q71 14 142 0" />
      {/* The pipe run with its welded sockets, the stripe along it. */}
      <Fill d="M92 324V126Q92 94 124 94H276Q308 94 308 126V140H292V126Q292 110 276 110H124Q108 110 108 126V324Z" />
      <Line d="M100 316V128M132 102H268" />
      <Stroke d="M92 324V126Q92 94 124 94H276Q308 94 308 126V140M108 324V126Q108 110 124 110H276Q292 110 292 126V140" draw={draw} />
      <Fill d={`${rrect(88, 220, 24, 16, 3)}${rrect(170, 90, 16, 24, 3)}`} strong />
      <Line d={`${rrect(88, 220, 24, 16, 3)}${rrect(170, 90, 16, 24, 3)}`} />
      {/* The tap. */}
      <Fill d={rrect(286, 140, 28, 26, 5)} strong />
      <Stroke d={`${rrect(286, 140, 28, 26, 5)}M286 150H270${circle(266, 150, 4)}M314 148H342Q352 148 352 158V168M314 158H338Q342 158 342 162V168`} draw={draw} />
      {/* The stream, drops, and the glass. */}
      <Stroke d="M344 170C344 200 345 230 345 262M350 170C350 200 349 230 349 262" draw={draw} />
      <Fill d={`${drop(326, 204)}${drop(368, 222)}${drop(362, 188)}`} strong />
      <Line d={`${drop(326, 204)}${drop(368, 222)}${drop(362, 188)}`} />
      <Fill d={GLASS_WATER} strong />
      <Line d="M319 262q7 -3 14 0t14 0t14 0t14 0M337 266a10 2.5 0 0 0 20 0" />
      <Stroke d="M316 234L322 304Q323 308 327 308H367Q371 308 372 304L378 234" draw={draw} />
      {/* A sprout in a pot: life. */}
      <Fill d="M200 282H236L232 308H204Z" />
      <Line d="M200 282H236L232 308H204Z" />
      <Stroke d="M218 282V254M218 266Q204 264 199 250Q213 248 218 262M218 258Q228 246 240 246Q238 260 218 262" draw={draw} />
    </Frame>
  );
}

/** One illustration per beat of /company/about, keyed by beat id. */
export const ABOUT_ILLUSTRATIONS = {
  about: AboutFactoryIllustration,
  production: AboutExtrusionIllustration,
  goal: AboutQualityLabIllustration,
  whyUs: AboutPartnershipIllustration,
  finale: AboutWaterIllustration,
} as const satisfies Record<string, (props: AboutIllustrationProps) => JSX.Element>;

export type AboutBeatId = keyof typeof ABOUT_ILLUSTRATIONS;
