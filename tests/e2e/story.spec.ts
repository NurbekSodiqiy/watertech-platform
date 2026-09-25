import { test, expect, type Page } from "@playwright/test";
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
 * /company/about runs LayersStory (R3/S05): a sticky pipe cross-section at ≥ lg
 * (Desktop Chrome here), one ring per chapter. /company/mission-values runs
 * ManifestStory (R3/S06): the mission lit word by word, the 2030 figure, the
 * values as sticky stacking cards — where a heading can be covered by the next
 * card, so "readable" there means uncovered and at full strength at some point
 * of the scroll, not merely present.
 */

const ABOUT = {
  path: "/company/about",
  url: /\/company\/about$/,
  headings: ["Biz haqimizda", "Ishlab chiqarish", "Maqsadimiz", "Nega WATERTECH"],
} as const;

const MISSION = {
  path: "/company/mission-values",
  url: /\/company\/mission-values$/,
  headings: ["Missiya", "Vizyon 2030", "№1", "Sifat – bu vijdon", "Innovatsiya", "Xavfsizlik"],
  // pages.company.missionValues.chapters.missiya.body
  sentence: "Odamlar uylarida xotirjam yashashlari uchun ishonchli va uzoq xizmat qiladigan suv tizimlarini yaratish.",
} as const;

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

/** The drawn fraction of each ring band of the sticky cross-section, outer → inner. */
async function ringFractions(page: Page): Promise<number[]> {
  const rings = page.locator("svg[data-layers-scene] [data-layers-ring]");
  await expect(rings, "the cross-section draws one band per chapter").toHaveCount(ABOUT.headings.length);
  return Promise.all(ABOUT.headings.map((_, index) => rings.nth(index).evaluate(drawnFraction)));
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

  test(`${ABOUT.path}: every chapter heading is visible and every ring closed after scrolling to the bottom`, async ({
    context,
    page,
    baseURL,
  }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
    const errors = collectConsoleErrors(page);

    await page.goto(ABOUT.path);
    await expectSignedInAt(page, ABOUT.url);
    await scrollToBottom(page);

    for (const heading of ABOUT.headings) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    // The finale's run-out must let the last chapter and the water finish.
    await expect
      .poll(async () => Math.min(...(await ringFractions(page))), { message: "a ring is still open at the bottom" })
      .toBeGreaterThan(0.99);
    expect(errors, `console errors on ${ABOUT.path}`).toEqual([]);
  });

  test(`${ABOUT.path}: reduced motion shows every ring drawn without scrolling`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await applySession(context, operatorCookie ?? "", baseURL);
    const page = await context.newPage();
    const errors = collectConsoleErrors(page);

    try {
      await page.goto(ABOUT.path);
      await expectSignedInAt(page, ABOUT.url);
      // No wheel, no scrollTo: the scene has to be finished already.
      const fractions = await ringFractions(page);
      expect(Math.min(...fractions), `rings not fully drawn: ${fractions.join(", ")}`).toBeGreaterThan(0.99);
      expect(await page.evaluate(() => window.scrollY), "the page scrolled by itself").toBe(0);

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
});
