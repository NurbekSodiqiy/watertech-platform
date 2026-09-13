import { test, expect } from "@playwright/test";

test("unauthenticated / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("/login renders the Google sign-in button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Google bilan kirish")).toBeVisible();
});

test("POST /api/events without a session cookie returns 401", async ({ request }) => {
  const res = await request.post("/api/events", {
    data: [],
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(401);
});
