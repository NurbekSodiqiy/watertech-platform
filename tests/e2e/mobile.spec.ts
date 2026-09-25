import { test, expect, type Page } from "@playwright/test";
import { applySession, expectSignedInAt, operatorCookie } from "./session";

/**
 * 375x812 (iPhone-class) smoke: nothing on these routes may overflow the
 * viewport horizontally. A sideways scrollbar on a phone is the one layout bug
 * an operator hits during a call and cannot work around.
 *
 * `html, body { overflow-x: clip }` in globals.css hides the symptom, so the
 * check measures the widest element instead of `document.scrollWidth`.
 */
const VIEWPORT = { width: 375, height: 812 };

const PUBLIC_ROUTES = ["/login", "/offline", "/ru/login"];
const OPERATOR_ROUTES = ["/", "/sales-process/scripts", "/products", "/faq", "/company/about", "/company/onboarding"];

test.use({ viewport: VIEWPORT });

interface Overflow {
  documentScrollWidth: number;
  widest: { width: number; selector: string } | null;
}

async function measureOverflow(page: Page): Promise<Overflow> {
  return page.evaluate((viewportWidth) => {
    let widest: { width: number; selector: string } | null = null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const rect = el.getBoundingClientRect();
      // Right edge past the viewport, and actually painted (skip collapsed
      // nodes and anything positioned off-screen on purpose, like sr-only).
      if (rect.width === 0 || rect.height === 0) continue;
      const overhang = rect.right - viewportWidth;
      if (overhang <= 1) continue;
      if (!widest || rect.right > widest.width) {
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
        widest = { width: Math.round(rect.right), selector: `${el.tagName.toLowerCase()}${id}${cls}` };
      }
    }
    return { documentScrollWidth: document.documentElement.scrollWidth, widest };
  }, VIEWPORT.width);
}

async function expectNoHorizontalScroll(page: Page, route: string): Promise<void> {
  const { documentScrollWidth, widest } = await measureOverflow(page);
  expect(documentScrollWidth, `${route} scrolls horizontally at ${VIEWPORT.width}px`).toBeLessThanOrEqual(
    VIEWPORT.width
  );
  expect(widest, `${route}: ${widest?.selector} reaches ${widest?.width}px`).toBeNull();
}

test.describe("mobile 375x812 — public routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no horizontal scroll`, async ({ page }) => {
      await page.goto(route);
      await expectNoHorizontalScroll(page, route);
    });
  }
});

test.describe("mobile 375x812 — operator routes", () => {
  test.skip(!operatorCookie, "TEST_OPERATOR_COOKIE is not set");

  test.beforeEach(async ({ context, baseURL }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
  });

  for (const route of OPERATOR_ROUTES) {
    test(`${route} has no horizontal scroll`, async ({ page }) => {
      await page.goto(route);
      await expectSignedInAt(page, new RegExp(`${route === "/" ? "localhost:3000/" : route}(\\?|$)`));
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalScroll(page, route);
    });
  }

  test("the search button is visible, inside the viewport and opens the palette", async ({ page }) => {
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    // Below `sm` the text field is hidden and an icon-only button takes over.
    const search = page.getByRole("button", { name: /Bilimlar bazasidan qidirish/ });
    await expect(search).toBeVisible();
    const box = await search.boundingBox();
    expect(box, "search button has a box").not.toBeNull();
    expect(box?.width ?? 0, "search button width").toBeGreaterThanOrEqual(24);
    expect((box?.x ?? 0) + (box?.width ?? 0), "search button right edge").toBeLessThanOrEqual(VIEWPORT.width);

    await search.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox")).toBeFocused();
  });

  test("the nav drawer stays inside the viewport", async ({ page }) => {
    await page.goto("/faq");
    await expectSignedInAt(page, /\/faq$/);

    await page.getByRole("button", { name: "Navigatsiyani ochish/yopish" }).click();
    await expect(page.getByRole("dialog", { name: "Navigatsiya" })).toBeVisible();
    await expectNoHorizontalScroll(page, "/faq (drawer open)");
  });
});
