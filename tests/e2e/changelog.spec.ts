import { test, expect, type Page } from "@playwright/test";
import { expectSignedInAt, useOperatorSession } from "./session";

/**
 * The unread badge next to "O'zgarishlar tarixi" in the sidebar is derived on
 * the client: published entry ids (passed down by the (app) layout) minus the
 * operator's `changelog.read` marks. Acknowledging one entry has to take the
 * count down by exactly one — and keep it down after a reload, since the mark
 * is stored per user in `user_state`, not per tab.
 */
const NAV_TITLE = "O'zgarishlar tarixi";
const MARK_READ = "Tanishdim";

/** The sidebar link, whose text is the title followed by the badge number
 * (NavCountBadge) when there is one. */
function navLink(page: Page) {
  return page.getByRole("link", { name: new RegExp(NAV_TITLE) }).first();
}

async function unreadCount(page: Page): Promise<number> {
  const text = (await navLink(page).textContent()) ?? "";
  const match = text.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

test.describe("changelog read receipts", () => {
  useOperatorSession();

  test("the unread badge goes down by one after acknowledging an entry", async ({ page }) => {
    await page.goto("/changelog");
    await expectSignedInAt(page, /\/changelog$/);

    // "Tanishdim" only renders for entries that are still unread, and only
    // once the stored marks have loaded (useChangelogRead reports "loading"
    // first, and claims nothing about read state until then).
    const markReadButtons = page.getByRole("button", { name: MARK_READ });
    await expect(markReadButtons.first()).toBeVisible();

    const buttonsBefore = await markReadButtons.count();
    const before = await unreadCount(page);
    expect(before, "no unread entries — seed the changelog or use a fresh operator").toBeGreaterThan(0);
    expect(before, "badge and unread cards disagree").toBe(buttonsBefore);

    await markReadButtons.first().click();

    await expect(markReadButtons).toHaveCount(buttonsBefore - 1);
    await expect.poll(() => unreadCount(page), { message: "badge did not decrease" }).toBe(before - 1);

    // The write is debounced 800 ms before it reaches user_state.
    await page.waitForTimeout(1500);
    await page.reload();
    await expect
      .poll(() => unreadCount(page), { message: "the read mark did not survive a reload" })
      .toBe(before - 1);
  });
});
