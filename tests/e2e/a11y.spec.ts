import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { applySession, expectSignedInAt, operatorCookie } from "./session";

/**
 * Automated accessibility scan (axe-core, WCAG 2.1 A/AA) plus a keyboard walk
 * through the chrome every operator route carries.
 *
 * The public routes are scanned on every run, including CI. The operator
 * routes need a session (docs/TESTING.md) and are skipped without one.
 *
 * Threshold: zero `serious` and zero `critical` violations. `minor`/`moderate`
 * findings are listed in the failure message but do not fail a run on their own.
 *
 * What this cannot see: axe returns `incomplete`, not `violation`, for text on a
 * semi-transparent fill (`bg-status-ok/15` and friends), because it cannot
 * composite the background itself. Those pairs are measured by hand instead —
 * see the contrast table in docs/AUDIT.md.
 */

const THEMES = ["light", "dark"] as const;

const PUBLIC_ROUTES = ["/login", "/offline"];
const OPERATOR_ROUTES = ["/", "/sales-process/scripts", "/products", "/faq", "/company/about"];

/** The theme is chosen by the `watertech-theme` localStorage key, which
 * ThemeScript reads before first paint. Seeded through an init script so it is
 * in place before the very first document, and for every navigation after. */
async function useTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("watertech-theme", value);
    } catch {
      // private mode — the class below is still applied
    }
  }, theme);
}

/** ThemeScript adds `class="dark"` before first paint when the stored value
 * says so, and defaults to light otherwise. */
async function expectTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDark, `expected the ${theme} theme`).toBe(theme === "dark");
}

async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const describe = (list: typeof results.violations) =>
    list.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) — ${v.helpUrl}`).join("\n");

  expect(
    blocking,
    `serious/critical violations:\n${describe(blocking)}\n\nother findings:\n${describe(
      results.violations.filter((v) => !blocking.includes(v))
    )}`
  ).toEqual([]);
}

for (const theme of THEMES) {
  test.describe(`a11y — public routes (${theme})`, () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} has no serious or critical violations`, async ({ page }) => {
        await useTheme(page, theme);
        await page.goto(route);
        await expectTheme(page, theme);
        await scan(page);
      });
    }
  });

  test.describe(`a11y — operator routes (${theme})`, () => {
    test.skip(!operatorCookie, "TEST_OPERATOR_COOKIE is not set");

    for (const route of OPERATOR_ROUTES) {
      test(`${route} has no serious or critical violations`, async ({ context, page, baseURL }) => {
        await applySession(context, operatorCookie ?? "", baseURL);
        await useTheme(page, theme);
        await page.goto(route);
        await expectSignedInAt(page, new RegExp(`${route === "/" ? "localhost:3000/" : route}(\\?|$)`));
        await expectTheme(page, theme);
        // The shell's client islands (pins, changelog badge, favourites) hydrate
        // from user_state; scanning before that would miss their markup.
        await page.waitForLoadState("networkidle");
        await scan(page);
      });
    }
  });
}

test.describe("keyboard walk", () => {
  test.skip(!operatorCookie, "TEST_OPERATOR_COOKIE is not set");

  test.beforeEach(async ({ context, baseURL }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
  });

  test("the first Tab reaches a skip link that moves focus into <main>", async ({ page }) => {
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    await page.keyboard.press("Tab");
    const skipLink = page.locator(":focus");
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    // sr-only until focused — it must become visible, not stay hidden.
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator(":focus")).toHaveAttribute("id", "main-content");
  });

  test("tabbing on from the skip link reaches the sidebar navigation", async ({ page }) => {
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    await page.keyboard.press("Tab"); // skip link
    // Not the very next stop: the sidebar's collapse toggle sits outside <nav>.
    let reached = false;
    for (let i = 0; i < 6 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = (await page.locator("nav[aria-label] :focus").count()) === 1;
    }
    expect(reached, "no labelled <nav> reached within six tabs").toBe(true);
  });

  test("Ctrl+K opens the command palette, which traps focus and restores it", async ({ page }) => {
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    const searchButton = page.getByRole("button", { name: /Bilimlar bazasidan qidirish/ });
    await searchButton.focus();

    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The trap focuses the first focusable element in the panel: the query input.
    await expect(dialog.locator(":focus")).toHaveCount(1);

    // Tab cannot leave the dialog.
    for (let i = 0; i < 12; i += 1) await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(searchButton).toBeFocused();
  });

  test("Ctrl+J opens the copilot panel, which traps focus and restores it", async ({ page }) => {
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    const copilotButton = page.getByRole("button", { name: "Copilot'ni ochish (Ctrl+J)" });
    await copilotButton.focus();

    await page.keyboard.press("Control+j");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);

    for (let i = 0; i < 10; i += 1) await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(copilotButton).toBeFocused();
  });

  test("the mobile nav drawer is a modal: focus is trapped and Escape closes it", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    const menuButton = page.getByRole("button", { name: "Navigatsiyani ochish/yopish" });
    await menuButton.focus();
    await menuButton.press("Enter");

    const drawer = page.getByRole("dialog", { name: "Navigatsiya" });
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(":focus")).toHaveCount(1);

    for (let i = 0; i < 8; i += 1) await page.keyboard.press("Tab");
    await expect(drawer.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
  });
});
