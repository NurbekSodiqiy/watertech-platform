import { test, expect, type Locator, type Page } from "@playwright/test";
import { applySession, collectConsoleErrors, expectSignedInAt, operatorCookie } from "./session";

/**
 * The scroll-storytelling pages (CLAUDE.md §14). What matters is not that
 * the animation runs but that it can never hide content:
 *
 * - with motion on, every chapter heading is readable once the reader has
 *   scrolled to the bottom — and the scene has finished there;
 * - with `prefers-reduced-motion: reduce`, the scene is already in its final
 *   state at first paint — no scrolling needed.
 *
 * Headings come from `pages.company.*.chapters.*.title` in messages/uz.json;
 * they are asserted verbatim so a copy change that forgets a chapter fails here.
 *
 * /company/about runs StickyRevealStory: a sticky scroll reveal — at ≥ lg
 * (Desktop Chrome here) the chapters scroll past a sticky card that shows the
 * active beat's line-art illustration (four chapters, then the finale), with
 * `data-active-beat` on the card; below lg every chapter carries its own
 * illustration, drawn once as it scrolls in. /company/mission-values runs
 * ManifestStory (R3/S06): the mission lit word by word, the 2030 figure, the
 * values as sticky stacking cards — where a heading can be covered by the next
 * card, so "readable" there means uncovered and at full strength at some point
 * of the scroll, not merely present. /company/onboarding runs RouteMap (R3/S07):
 * the four days as a route drawn up to the reader's real checklist progress —
 * a work page too, so its checkbox is exercised end to end (it ticks the
 * operator's own onboarding off and back, leaving their progress as it was).
 */

const ABOUT = {
  path: "/company/about",
  url: /\/company\/about$/,
  headings: ["Biz haqimizda", "Ishlab chiqarish", "Maqsadimiz", "Nega WATERTECH"],
  /** The four chapters and the finale. */
  beats: 5,
} as const;

/** Below lg (the sticky card is gone, the illustrations are inline). */
const PHONE = { width: 375, height: 812 } as const;

const MISSION = {
  path: "/company/mission-values",
  url: /\/company\/mission-values$/,
  headings: ["Missiya", "Vizyon 2030", "№1", "Sifat – bu vijdon", "Innovatsiya", "Xavfsizlik"],
  // pages.company.missionValues.chapters.missiya.body
  sentence: "Odamlar uylarida xotirjam yashashlari uchun ishonchli va uzoq xizmat qiladigan suv tizimlarini yaratish.",
} as const;

const ONBOARDING = {
  path: "/company/onboarding",
  url: /\/company\/onboarding$/,
  // pages.company.onboarding.route.title, then dayHeading over lib/content/onboarding.ts
  headings: [
    "Sizning yo'lingiz",
    "1-kun: Biz haqimizda va mahsulot",
    "2-kun: Mahsulotni o'rganishga sho'ng'ish",
    "3-kun: Mijoz va CRM",
    "4-kun: Savdo Qurollari va Amaliyot",
  ],
  days: 4,
} as const;

/** A day's checkbox: pages.company.onboarding.route.dayDone plus the visually
 * hidden day number (route.dayNumber) that tells the four apart. */
function dayCheckbox(page: Page, day: number) {
  return page.getByRole("checkbox", { name: new RegExp(`^Kunni yakunladim \\(${day}-kun\\)$`) });
}

/** The checkpoints' states in day order, once the reader's progress has loaded. */
async function checkpointStates(page: Page): Promise<string[]> {
  const checkpoints = page.locator("[data-route-checkpoint]");
  await expect(checkpoints, "one checkpoint per day").toHaveCount(ONBOARDING.days);
  await expect(checkpoints.first(), "the progress never loaded").not.toHaveAttribute("data-route-checkpoint", "loading");
  return checkpoints.evaluateAll((els) => els.map((el) => el.getAttribute("data-route-checkpoint") ?? ""));
}

/** Segments drawn for those states (route-geometry's journey().reached): the
 * lead-in plus one per checkpoint up to the reader's, or all of them — through
 * the finish — once every day is done. */
function reachedFor(states: readonly string[]): number {
  const current = states.indexOf("current");
  return current === -1 ? states.length + 1 : current + 1;
}

/** The server-drawn solid segments that are on screen (each segment exists
 * once per layout; the other layout's copy is display:none). */
async function visibleDrawnSegments(page: Page): Promise<number> {
  return page
    .locator("[data-route-drawn]")
    .evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).length);
}

/** Distance, px, from the end of the scroll layer's drawn line to the centre
 * of `target` — the reader's checkpoint, or the finish. The drawn fraction is
 * the first number of the path's dash array (see drawnFraction). */
async function lineEndGap(page: Page, target: string): Promise<number> {
  return page.evaluate((selector) => {
    const svg = document.querySelector("svg[data-route-trail='active']");
    const path = svg?.querySelector("path.stroke-accent");
    const goal = document.querySelector(selector);
    if (!(svg instanceof SVGSVGElement) || !(path instanceof SVGPathElement) || !goal) return Infinity;
    const raw = path.getAttribute("stroke-dasharray") ?? path.style.strokeDasharray;
    const fraction = raw.trim() ? Number.parseFloat(raw) : 1;
    const end = path.getPointAtLength(fraction * path.getTotalLength());
    const origin = svg.getBoundingClientRect();
    const box = goal.getBoundingClientRect();
    return Math.hypot(origin.left + end.x - (box.left + box.width / 2), origin.top + end.y - (box.top + box.height / 2));
  }, target);
}

/** The sticky TopBar (`h-14`): anything behind it cannot be read. */
const TOPBAR_HEIGHT = 56;

/**
 * How much of an SVG stroke is drawn, 0 → 1.
 *
 * framer-motion normalises a `pathLength` motion value by setting the SVG
 * `pathLength` attribute to 1 and writing `stroke-dasharray: "<drawn>px 1px"`,
 * so the first number of the dash array *is* the fraction (see buildSVGPath in
 * framer-motion). No dash array at all means nothing is clipped — the static
 * final drawing that reduced motion gets.
 */
function drawnFraction(el: Element): number {
  const raw = el.getAttribute("stroke-dasharray") ?? (el instanceof SVGElement ? el.style.strokeDasharray : "");
  if (!raw.trim()) return 1;
  const drawn = Number.parseFloat(raw);
  return Number.isFinite(drawn) ? drawn : 1;
}

/** The drawn fraction of every main stroke (`stroke-accent`) inside `scope`. */
async function strokeFractions(scope: Locator): Promise<number[]> {
  const strokes = scope.locator("path.stroke-accent");
  const count = await strokes.count();
  expect(count, "an illustration without main strokes").toBeGreaterThan(0);
  return Promise.all(Array.from({ length: count }, (_, index) => strokes.nth(index).evaluate(drawnFraction)));
}

/** The sticky card's active beat (≥ lg). */
async function activeBeat(page: Page): Promise<number> {
  return Number(await page.locator("[data-active-beat]").getAttribute("data-active-beat"));
}

/** The card's layer for beat `index` (it exists once that beat has been active). */
function cardLayer(page: Page, index: number): Locator {
  return page.locator(`[data-beat-illustration="card"][data-beat="${index}"]`);
}

/** Wheels in `deltaY` steps until the page stops moving, recording every
 * active beat on the way (each once, in the order they became active). */
async function beatsWhileWheeling(page: Page, deltaY: number): Promise<number[]> {
  const seen = [await activeBeat(page)];
  let lastY = -1;
  for (let step = 0; step < 160; step += 1) {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(90);
    const beat = await activeBeat(page);
    if (beat !== seen[seen.length - 1]) seen.push(beat);
    const y = await page.evaluate(() => window.scrollY);
    if (y === lastY) break;
    lastY = y;
  }
  await page.waitForTimeout(500);
  const last = await activeBeat(page);
  if (last !== seen[seen.length - 1]) seen.push(last);
  return seen;
}

/** The drawn fraction of ManifestStory's two lines: the mission underline and the closing water line. */
async function manifestLineFractions(page: Page): Promise<number[]> {
  const paths = page.locator("svg[data-manifest-line] path");
  await expect(paths, "the underline and the water line").toHaveCount(2);
  return Promise.all([0, 1].map((index) => paths.nth(index).evaluate(drawnFraction)));
}

/** Rendered opacity of every element matching `selector`, times its ancestors'. */
async function effectiveOpacities(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      let opacity = 1;
      for (let node: Element | null = el; node; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return opacity;
    })
  );
}

/**
 * The `names` whose h2 a reader can read right now: on screen below the
 * TopBar, not covered by another element (a stacking card), and at full
 * strength (no dimmed ancestor).
 */
async function readableHeadings(page: Page, names: readonly string[]): Promise<string[]> {
  return page.evaluate(
    ({ names, topBar }) =>
      Array.from(document.querySelectorAll("h2")).flatMap((heading) => {
        const name = heading.textContent?.trim() ?? "";
        if (!names.includes(name)) return [];
        const box = heading.getBoundingClientRect();
        const x = box.left + Math.min(box.width / 2, 12);
        const y = box.top + box.height / 2;
        if (y < topBar || y > window.innerHeight || box.width === 0) return [];
        const hit = document.elementFromPoint(x, y);
        if (!hit || !heading.contains(hit)) return [];
        let opacity = 1;
        for (let node: Element | null = heading; node; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
        }
        return opacity > 0.99 ? [name] : [];
      }),
    { names, topBar: TOPBAR_HEIGHT }
  );
}

/** Wheels down to the end of the page, collecting every heading that was readable on the way. */
async function readHeadingsDownThePage(page: Page, names: readonly string[]): Promise<Set<string>> {
  const seen = new Set<string>(await readableHeadings(page, names));
  let lastY = -1;
  for (let step = 0; step < 120; step += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(140);
    for (const name of await readableHeadings(page, names)) seen.add(name);
    const y = await page.evaluate(() => window.scrollY);
    if (y === lastY) break;
    lastY = y;
  }
  await page.waitForTimeout(800);
  return seen;
}

async function scrollToBottom(page: Page): Promise<void> {
  // Real wheel events in steps: useScroll reads the document scroll position
  // and the scene's springs need frames to settle at each new value.
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
}

test.describe("scroll stories", () => {
  test.skip(!operatorCookie, "TEST_OPERATOR_COOKIE is not set");

  test(`${ABOUT.path}: the card follows the reader through every beat and back, every heading visible`, async ({
    context,
    page,
    baseURL,
  }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
    const errors = collectConsoleErrors(page);

    await page.goto(ABOUT.path);
    await expectSignedInAt(page, ABOUT.url);
    await expect(page.locator("[data-active-beat]"), "the sticky card at ≥ lg").toBeVisible();
    expect(await activeBeat(page), "the first beat is active at the top").toBe(0);
    await expect(cardLayer(page, 0)).toBeVisible();

    // Down: every beat in order, none skipped — the finale's run-out lets the last one arrive.
    expect(await beatsWhileWheeling(page, 120), "beats while scrolling down").toEqual([0, 1, 2, 3, 4]);
    for (const heading of ABOUT.headings) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    // The finale's illustration arrived and drew itself completely.
    await expect(cardLayer(page, ABOUT.beats - 1)).toHaveCSS("opacity", "1");
    await expect
      .poll(async () => Math.min(...(await strokeFractions(cardLayer(page, ABOUT.beats - 1)))), {
        message: "the finale's illustration is not fully drawn",
      })
      .toBeGreaterThan(0.99);
    const beats = page.locator("[data-active]");
    await expect(beats).toHaveCount(ABOUT.beats);
    expect(await beats.evaluateAll((els) => els.map((el) => el.getAttribute("data-active")))).toEqual([
      "false",
      "false",
      "false",
      "false",
      "true",
    ]);

    // And back up to the first beat.
    expect(await beatsWhileWheeling(page, -120), "beats while scrolling up").toEqual([4, 3, 2, 1, 0]);
    await expect(cardLayer(page, 0)).toHaveCSS("opacity", "1");
    expect(errors, `console errors on ${ABOUT.path}`).toEqual([]);
  });

  test(`${ABOUT.path}: reduced motion — readable without scrolling, drawn at once, beats swap instantly`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await applySession(context, operatorCookie ?? "", baseURL);
    const page = await context.newPage();
    const errors = collectConsoleErrors(page);

    try {
      await page.goto(ABOUT.path);
      await expectSignedInAt(page, ABOUT.url);
      // No wheel, no scrollTo: every heading is there at full strength.
      for (const heading of ABOUT.headings) {
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      }
      const headings = await effectiveOpacities(page, "main h2");
      expect(Math.min(...headings), "a heading is dimmed").toBeGreaterThan(0.99);
      expect(await page.evaluate(() => window.scrollY), "the page scrolled by itself").toBe(0);

      // The card shows the first beat, fully drawn.
      expect(await activeBeat(page)).toBe(0);
      const first = await strokeFractions(cardLayer(page, 0));
      expect(Math.min(...first), `strokes not fully drawn: ${first.join(", ")}`).toBeGreaterThan(0.99);

      // Jump to the third beat: two frames after it becomes active, the card
      // shows it at full strength and nothing else (a crossfade would still be
      // on its way).
      const swap = await page.evaluate(async () => {
        const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const third = document.querySelectorAll("section[data-active]")[2];
        const card = document.querySelector("[data-active-beat]");
        if (!third || !card) return null;
        // Its top well above the reading line (35%), the next one well below.
        window.scrollTo(0, third.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.2);
        for (let i = 0; i < 120 && card.getAttribute("data-active-beat") !== "2"; i += 1) await frame();
        await frame();
        await frame();
        return Array.from(document.querySelectorAll('[data-beat-illustration="card"]')).map((layer) => ({
          beat: layer.getAttribute("data-beat"),
          opacity: Number(getComputedStyle(layer).opacity),
        }));
      });
      expect(swap, "the third beat never became active").not.toBeNull();
      expect(swap?.find((layer) => layer.beat === "2")?.opacity, "the new beat is not at full strength").toBe(1);
      expect(
        swap?.filter((layer) => layer.beat !== "2").every((layer) => layer.opacity === 0),
        `the old beat is still visible: ${JSON.stringify(swap)}`
      ).toBe(true);
      const third = await strokeFractions(cardLayer(page, 2));
      expect(Math.min(...third), `strokes not fully drawn: ${third.join(", ")}`).toBeGreaterThan(0.99);
      expect(errors, `console errors on ${ABOUT.path}`).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test(`${ABOUT.path}: below lg every chapter carries its own illustration, drawn once in view`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ viewport: PHONE });
    await applySession(context, operatorCookie ?? "", baseURL);
    const page = await context.newPage();
    const errors = collectConsoleErrors(page);

    try {
      await page.goto(ABOUT.path);
      await expectSignedInAt(page, ABOUT.url);
      await expect(page.locator("[data-active-beat]"), "the sticky card below lg").toBeHidden();

      const figures = page.locator('[data-beat-illustration="inline"]');
      await expect(figures, "one inline illustration per chapter and the finale").toHaveCount(ABOUT.beats);
      for (let index = 0; index < ABOUT.beats; index += 1) {
        const figure = figures.nth(index);
        await figure.scrollIntoViewIfNeeded();
        await expect(figure).toBeVisible();
        await expect
          .poll(async () => Math.min(...(await strokeFractions(figure))), {
            message: `inline illustration ${index} is not fully drawn in view`,
          })
          .toBeGreaterThan(0.99);
      }
      for (const heading of ABOUT.headings) {
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      }
      expect(errors, `console errors on ${ABOUT.path}`).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test(`${MISSION.path}: every heading is readable at some point of the scroll, every word lit at the bottom`, async ({
    context,
    page,
    baseURL,
  }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
    const errors = collectConsoleErrors(page);

    await page.goto(MISSION.path);
    await expectSignedInAt(page, MISSION.url);
    const seen = await readHeadingsDownThePage(page, MISSION.headings);

    expect([...seen].sort(), "headings never readable (covered, dimmed or off-screen)").toEqual(
      [...MISSION.headings].sort()
    );
    for (const heading of MISSION.headings) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    // The sentence has scrolled past: every word is lit (or was never dimmed).
    const words = await effectiveOpacities(page, "[data-manifest-word]");
    expect(words.length, "the mission is split into words").toBeGreaterThan(1);
    expect(Math.min(...words), "a mission word is still dimmed at the bottom").toBeGreaterThan(0.99);
    // The run-out lets the last value card land fully readable, and the closing line draw.
    await expect(page.getByRole("heading", { name: MISSION.headings[MISSION.headings.length - 1], exact: true })).toBeInViewport();
    await expect
      .poll(async () => Math.min(...(await manifestLineFractions(page))), { message: "a line is not drawn at the bottom" })
      .toBeGreaterThan(0.99);
    expect(errors, `console errors on ${MISSION.path}`).toEqual([]);
  });

  test(`${MISSION.path}: reduced motion shows the finished scene without scrolling`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await applySession(context, operatorCookie ?? "", baseURL);
    const page = await context.newPage();
    const errors = collectConsoleErrors(page);

    try {
      await page.goto(MISSION.path);
      await expectSignedInAt(page, MISSION.url);
      // No wheel, no scrollTo: the scene has to be finished already.
      await page.waitForTimeout(600);

      for (const heading of MISSION.headings) {
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      }
      const words = await effectiveOpacities(page, "[data-manifest-word]");
      expect(Math.min(...words), "a mission word is dimmed").toBeGreaterThan(0.99);
      const lines = await manifestLineFractions(page);
      expect(Math.min(...lines), `lines not fully drawn: ${lines.join(", ")}`).toBeGreaterThan(0.99);
      const bars = page.locator("[data-manifest-bar]");
      await expect(bars).toHaveCount(2);
      expect(
        await bars.evaluateAll((els) => els.map((el) => getComputedStyle(el).transform)),
        "the vision bars are not at full height"
      ).toEqual(["none", "none"]);
      expect(await effectiveOpacities(page, "[data-manifest-house-fill]"), "our house is not filled").toEqual([1]);
      const cards = await effectiveOpacities(page, "[data-manifest-card] > div");
      expect(cards.length, "one card per value").toBe(4);
      expect(Math.min(...cards), "a value card is dimmed").toBeGreaterThan(0.99);
      expect(await page.evaluate(() => window.scrollY), "the page scrolled by itself").toBe(0);

      // Scrolling under reduced motion stacks the cards (plain CSS sticky) but never shrinks or dims them.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      const after = await effectiveOpacities(page, "[data-manifest-card] > div");
      expect(Math.min(...after), "a value card dimmed under reduced motion").toBeGreaterThan(0.99);
      expect(
        await page.locator("[data-manifest-card]").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform)),
        "a value card scaled under reduced motion"
      ).toEqual(["none", "none", "none", "none"]);
      expect(errors, `console errors on ${MISSION.path}`).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test(`${MISSION.path}: screen readers get the mission sentence exactly once`, async ({ context, page, baseURL }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
    await page.goto(MISSION.path);
    await expectSignedInAt(page, MISSION.url);

    const tree = await page.locator("main").ariaSnapshot();
    expect(tree.split(MISSION.sentence).length - 1, "the sentence in the accessibility tree").toBe(1);
    // Neither the words one by one: every animated span sits under aria-hidden.
    const exposedWords = await page
      .locator("[data-manifest-word]")
      .evaluateAll((els) => els.filter((el) => !el.closest('[aria-hidden="true"]')).length);
    expect(exposedWords, "word spans exposed to assistive technology").toBe(0);
  });

  test(`${ONBOARDING.path}: reduced motion shows the route drawn up to the reader, no traveller, no scrolling`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await applySession(context, operatorCookie ?? "", baseURL);
    const page = await context.newPage();
    const errors = collectConsoleErrors(page);

    try {
      await page.goto(ONBOARDING.path);
      await expectSignedInAt(page, ONBOARDING.url);
      const states = await checkpointStates(page);
      expect(states.filter((state) => state === "current").length, "more than one 'you are here'").toBeLessThanOrEqual(1);
      // Past the idle period in which the scroll layer would load: it must not.
      await page.waitForTimeout(1500);
      await expect(page.locator("svg[data-route-trail]"), "the scroll layer loaded under reduced motion").toHaveCount(0);
      await expect(page.locator("[data-route-traveller]")).toHaveCount(0);
      // The server-drawn route is the final state: solid exactly up to the reader.
      expect(await visibleDrawnSegments(page), `drawn segments for ${states.join(", ")}`).toBe(reachedFor(states));
      expect(await page.evaluate(() => window.scrollY), "the page scrolled by itself").toBe(0);

      for (const heading of ONBOARDING.headings) {
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      }
      expect(errors, `console errors on ${ONBOARDING.path}`).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test(`${ONBOARDING.path}: the line is drawn to the reader's checkpoint after scrolling to the bottom`, async ({
    context,
    page,
    baseURL,
  }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
    const errors = collectConsoleErrors(page);

    await page.goto(ONBOARDING.path);
    await expectSignedInAt(page, ONBOARDING.url);
    const states = await checkpointStates(page);
    for (const heading of ONBOARDING.headings) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }

    await expect(page.locator("svg[data-route-trail='active']"), "the scroll layer never took over").toHaveCount(1);
    // Taking over, it drops the static copy of the solid line.
    expect(await visibleDrawnSegments(page)).toBe(0);
    await scrollToBottom(page);

    const target = states.includes("current") ? '[data-route-checkpoint="current"]' : "[data-route-finish]";
    await expect
      .poll(() => lineEndGap(page, target), { message: "the line does not end where the reader is" })
      .toBeLessThan(4);
    expect(errors, `console errors on ${ONBOARDING.path}`).toEqual([]);
  });

  test(`${ONBOARDING.path}: ticking a day off is instant and survives a reload`, async ({ context, page, baseURL }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
    const errors = collectConsoleErrors(page);

    await page.goto(ONBOARDING.path);
    await expectSignedInAt(page, ONBOARDING.url);
    const states = await checkpointStates(page);
    // The reader's day — or, with everything done, the last one (unticked and ticked back).
    const current = states.indexOf("current");
    const index = current === -1 ? states.length - 1 : current;
    const day = index + 1;
    const checkpoint = page.locator("[data-route-checkpoint]").nth(index);

    const box = dayCheckbox(page, day);
    await expect(box, "disabled until the progress has loaded").toBeEnabled();
    const before = await box.isChecked();
    await box.setChecked(!before);
    await expect(box).toBeChecked({ checked: !before });
    await expect(checkpoint).toHaveAttribute("data-route-checkpoint", before ? "current" : "done");

    // The write is debounced by 800 ms; let it reach the server before reloading.
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(dayCheckbox(page, day)).toBeEnabled();
    await expect(dayCheckbox(page, day)).toBeChecked({ checked: !before });
    await expect(page.locator("[data-route-checkpoint]").nth(index)).toHaveAttribute(
      "data-route-checkpoint",
      before ? "current" : "done"
    );

    // Leave the operator's progress as it was.
    await dayCheckbox(page, day).setChecked(before);
    await expect(dayCheckbox(page, day)).toBeChecked({ checked: before });
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(dayCheckbox(page, day)).toBeEnabled();
    await expect(dayCheckbox(page, day)).toBeChecked({ checked: before });
    expect(errors, `console errors on ${ONBOARDING.path}`).toEqual([]);
  });
});
