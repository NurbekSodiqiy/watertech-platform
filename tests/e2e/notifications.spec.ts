import { test, expect } from "@playwright/test";

// Smoke only: the notifications inbox sits behind the same admin gate.

test("/admin/notifications redirects to /login without a session", async ({ page }) => {
  await page.goto("/admin/notifications");
  await expect(page).toHaveURL(/\/login$/);
});

test("/ru/admin/notifications redirects to /ru/login without a session", async ({ page }) => {
  await page.goto("/ru/admin/notifications");
  await expect(page).toHaveURL(/\/ru\/login$/);
});
