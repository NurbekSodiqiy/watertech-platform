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
 * (Desktop Chrome here), one ring per chapter. /company/mission-values still
 * runs PipelineStory until R3/S06 replaces it.
 */

const ABOUT = {
  path: "/company/about",
  url: /\/company\/about$/,
  headings: ["Biz haqimizda", "Ishlab chiqarish", "Maqsadimiz", "Nega WATERTECH"],
} as const;

const PIPELINE_STORIES = [
  {
    path: "/company/mission-values",
    url: /\/company\/mission-values$/,
    headings: ["Missiya", "Vizyon 2030", "№1", "Sifat – bu vijdon", "Innovatsiya", "Xavfsizlik"],
  },
] as const;

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

/** How much of PipelineStory's main water stroke is drawn, 0 → 1. */
async function waterPathFraction(page: Page): Promise<number> {
  // Document order inside PipelineDrawing: dry body, dry bore, then the main
  // water stroke — the first accent-stroked path in the scene's <svg>.
  const path = page.locator("svg path.stroke-accent").first();
  await expect(path).toBeAttached();
  return path.evaluate(drawnFraction);
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

  for (const story of PIPELINE_STORIES) {
    test(`${story.path}: every chapter heading is visible after scrolling to the bottom`, async ({
      context,
      page,
      baseURL,
    }) => {
      await applySession(context, operatorCookie ?? "", baseURL);
      const errors = collectConsoleErrors(page);

      await page.goto(story.path);
      await expectSignedInAt(page, story.url);
      await scrollToBottom(page);

      for (const heading of story.headings) {
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      }
      expect(errors, `console errors on ${story.path}`).toEqual([]);
    });

    test(`${story.path}: reduced motion shows the finished scene without scrolling`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      await applySession(context, operatorCookie ?? "", baseURL);
      const page = await context.newPage();
      const errors = collectConsoleErrors(page);

      try {
        await page.goto(story.path);
        await expectSignedInAt(page, story.url);
        // No wheel, no scrollTo: the scene has to be finished already.
        await page.waitForTimeout(600);

        for (const heading of story.headings) {
          await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        }
        expect(await waterPathFraction(page), "water path is not fully drawn").toBeGreaterThan(0.99);
        expect(errors, `console errors on ${story.path}`).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
});
