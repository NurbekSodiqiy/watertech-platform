import { test, expect, type Page } from "@playwright/test";
import { expectSignedInAt, useOperatorSession } from "./session";

/**
 * Pinning end to end: pin an objection on the scripts page, find it under
 * Favourites on the home page, reload (it comes back from `user_state`, not
 * just from memory), unpin it there, and see it gone.
 *
 * Labels are the `common.pin` / `common.unpin` strings from messages/uz.json —
 * PinButton keeps one accessible name in both states and carries the state on
 * `aria-pressed`, so the button is found by that name and asserted on pressed.
 */
const PIN_LABEL = "Sevimlilarga qo'shish";
const FAVOURITES_LABEL = "Sevimlilar";
const OBJECTION_KIND = "E'tiroz";

/** The objection PinButton only exists once an objection is selected; the chip
 * row sits under the left panel and is labelled "Tez e'tirozlar:". */
async function selectFirstObjection(page: Page): Promise<string> {
  const chipRow = page.locator("div").filter({ hasText: /^Tez e'tirozlar:/ }).last();
  const chip = chipRow.getByRole("button").first();
  await expect(chip).toBeVisible();
  const label = (await chip.textContent())?.trim() ?? "";
  await chip.click();
  return label;
}

function favouriteCard(page: Page, title: string) {
  return page.getByRole("link", { name: new RegExp(`${OBJECTION_KIND}\\s*${escapeRegExp(title)}`) });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("pins", () => {
  useOperatorSession();

  test("pin an objection, it appears on home, survives a reload, and unpins", async ({ page }) => {
    // --- pin it on the scripts page -----------------------------------------
    await page.goto("/sales-process/scripts");
    await expectSignedInAt(page, /\/sales-process\/scripts/);

    const objectionLabel = await selectFirstObjection(page);
    expect(objectionLabel, "no objection chips rendered").not.toBe("");

    const pinButton = page.getByRole("button", { name: PIN_LABEL }).first();
    // Disabled until `user_state` has hydrated — a toggle before that would be
    // applied to the empty default (see PinButton).
    await expect(pinButton).toBeEnabled();
    await expect(pinButton).toHaveAttribute("aria-pressed", "false");
    await pinButton.click();
    await expect(pinButton).toHaveAttribute("aria-pressed", "true");

    // --- it shows up under Favourites on home -------------------------------
    await page.goto("/");
    await expectSignedInAt(page, /localhost:3000\/$/);
    await expect(page.getByText(FAVOURITES_LABEL, { exact: true })).toBeVisible();
    await expect(favouriteCard(page, objectionLabel)).toBeVisible();

    // --- and survives a reload (it came from the server, not from memory) ---
    await page.reload();
    await expect(favouriteCard(page, objectionLabel)).toBeVisible();

    // --- unpinning removes it -----------------------------------------------
    const card = favouriteCard(page, objectionLabel).locator("..");
    const unpin = card.getByRole("button", { name: PIN_LABEL });
    await expect(unpin).toHaveAttribute("aria-pressed", "true");
    await unpin.click();
    await expect(favouriteCard(page, objectionLabel)).toHaveCount(0);

    // The write is debounced by 800 ms; give it time to reach the server
    // before the reload, or the reload races the flush.
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(favouriteCard(page, objectionLabel)).toHaveCount(0);
  });
});
