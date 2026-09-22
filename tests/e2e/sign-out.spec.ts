import { test, expect, type Page } from "@playwright/test";
import { expectSignedInAt, useOperatorSession } from "./session";

/**
 * What a shared office PC looks like after an operator signs out: no
 * `wt-us` key of theirs left in localStorage, no telemetry buffer, an empty
 * sessionStorage, and none of the caches that could serve the knowledge base
 * back without a session.
 *
 * Needs a live session (TEST_OPERATOR_COOKIE, see ./session.ts); the whole
 * block skips itself without one.
 */

/** `common.signOut` / `avatarMenu.menuLabel` from messages/uz.json. */
const AVATAR_LABEL = "Foydalanuvchi menyusi";
const SIGN_OUT_LABEL = "Chiqish";

/** The caches a sign-out must delete — lib/pwa/sw-routes.ts, restated here so
 * the assertion fails if that list is quietly narrowed. */
const PURGED_CACHES = [
  "sales-process-pages",
  "search-index",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "apis",
  "others",
  "next-data",
  "static-data-assets",
  "cross-origin",
];

async function localStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage));
}

async function cacheNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => ("caches" in window ? caches.keys() : []));
}

test.describe("sign out", () => {
  useOperatorSession();

  test("leaves no user-state key, no telemetry buffer and none of the purged caches", async ({ page }) => {
    await page.goto("/sales-process/scripts");
    await expectSignedInAt(page, /\/sales-process\/scripts/);

    // Give the stores something to leave behind: the scripts page writes
    // `scripts.position`, and every page writes telemetry.
    await page.waitForFunction(() => Object.keys(window.localStorage).some((key) => key.startsWith("wt-us:")), null, {
      timeout: 10_000,
    });
    expect(await localStorageKeys(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^wt-us:/)]));

    await page.getByRole("button", { name: AVATAR_LABEL }).click();
    await Promise.all([
      page.waitForURL(/\/login$/, { timeout: 15_000 }),
      page.getByRole("menuitem", { name: SIGN_OUT_LABEL }).click(),
    ]);

    const keys = await localStorageKeys(page);
    expect(keys.filter((key) => key.startsWith("wt-us"))).toEqual([]);
    expect(keys.filter((key) => key.startsWith("wt-events-buffer"))).toEqual([]);
    // The theme is not account data and must survive.
    expect(keys.filter((key) => key === "watertech-theme").length).toBeLessThanOrEqual(1);

    expect(await page.evaluate(() => window.sessionStorage.length)).toBe(0);

    const caches = await cacheNames(page);
    expect(caches.filter((name) => PURGED_CACHES.includes(name))).toEqual([]);
  });

  test("lands on /login as a signed-out visitor, with no bounce back into the app", async ({ page }) => {
    await page.goto("/");
    await expectSignedInAt(page, /localhost:3000\/(\?|$)/);

    await page.getByRole("button", { name: AVATAR_LABEL }).click();
    await Promise.all([
      page.waitForURL(/\/login$/, { timeout: 15_000 }),
      page.getByRole("menuitem", { name: SIGN_OUT_LABEL }).click(),
    ]);

    // A hard navigation, so nothing of the previous tree survived it.
    expect(await page.evaluate(() => window.location.pathname)).toBe("/login");

    // Going back into the app now redirects to /login rather than serving a
    // cached copy of it.
    await page.goto("/products");
    await expect(page).toHaveURL(/\/login/);
  });
});
