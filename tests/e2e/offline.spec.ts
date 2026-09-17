import { test, expect } from "@playwright/test";

// /offline is public (the service worker precaches it without a session) and
// must render its EmptyState in place — never bounce to /login.

const COPY = {
  uz: { path: "/offline", title: "Internet aloqasi yo'q", retry: "Qayta urinish" },
  ru: { path: "/ru/offline", title: "Нет подключения к интернету", retry: "Повторить" },
} as const;

for (const [locale, copy] of Object.entries(COPY)) {
  test(`${copy.path} renders the offline EmptyState with a retry button (${locale})`, async ({ page }) => {
    const response = await page.goto(copy.path);

    expect(response?.status()).toBe(200);
    expect(response?.request().redirectedFrom()).toBeNull();
    await expect(page).toHaveURL(new RegExp(`${copy.path}$`));
    await expect(page.getByText(copy.title, { exact: true })).toBeVisible();

    const retry = page.getByRole("button", { name: copy.retry });
    await expect(retry).toBeVisible();

    // Retry is a full reload of the same page.
    await Promise.all([page.waitForEvent("load"), retry.click()]);
    await expect(page).toHaveURL(new RegExp(`${copy.path}$`));
    await expect(page.getByRole("button", { name: copy.retry })).toBeVisible();
  });
}
