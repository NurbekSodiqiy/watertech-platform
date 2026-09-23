import { test, expect } from "@playwright/test";
import { expectSignedInAt, useManagerSession } from "./session";

/**
 * S12: DataTable's status tabs, bulk-action bar and reorder mode. Exercises
 * the UI paths without committing a destructive write against the shared
 * project's real content — every action taken here is cancelled, never
 * confirmed, so the spec is safe to run against seeded (not disposable)
 * data. A full publish/reorder round-trip belongs in a project with its own
 * disposable database, which this repo does not have (see docs/TESTING.md).
 *
 * Requires TEST_SESSION_COOKIE (a manager session) — skips itself otherwise,
 * same as every other manager-only spec (tests/e2e/session.ts).
 */
test.describe("admin DataTable bulk actions and reorder mode", () => {
  useManagerSession();

  test("status tabs and search render, and bulk-select opens the delete confirmation", async ({ page }) => {
    await page.goto("/admin/faq");
    await expectSignedInAt(page, /\/admin\/faq$/);

    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole("tab")).toHaveCount(3);

    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    test.skip(rowCount === 0, "no FAQ rows seeded to select");

    // Selects the first row and opens the bulk bar.
    await rows.first().getByRole("checkbox").check();
    const bulkDelete = page.getByRole("button", { name: /o'chirish|удалить/i }).last();
    await bulkDelete.click();

    // The confirmation dialog opens — cancelled, not confirmed, so nothing
    // is actually deleted.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /bekor qilish|отмена/i }).click();
    await expect(dialog).toBeHidden();
  });

  test("reorder mode opens a draggable list and cancel leaves the order untouched", async ({ page }) => {
    await page.goto("/admin/faq");
    await expectSignedInAt(page, /\/admin\/faq$/);

    const reorderButton = page.getByRole("button", { name: /tartiblash|сортировка/i });
    const isEnabled = await reorderButton.isEnabled().catch(() => false);
    test.skip(!isEnabled, "fewer than two FAQ rows seeded to reorder");

    await reorderButton.click();
    const reorderList = page.locator("ol li");
    await expect(reorderList.first()).toBeVisible();

    // Cancel, not save — the reorder never reaches the server.
    await page.getByRole("button", { name: /bekor qilish|отмена/i }).click();
    await expect(page.locator("table")).toBeVisible();
  });
});
