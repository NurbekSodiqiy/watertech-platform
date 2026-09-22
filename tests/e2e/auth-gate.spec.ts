import { test, expect, type Page } from "@playwright/test";

// Unauthenticated: middleware must send every gated route to the login page of
// the same locale, with no error query (that one is for signed-in users who
// aren't on the allow-list).

const LOGIN_BUTTON = { uz: "Google bilan kirish", ru: "Войти через Google" } as const;

const GATED_ROUTES: { path: string; login: RegExp; locale: keyof typeof LOGIN_BUTTON }[] = [
  { path: "/", login: /\/login$/, locale: "uz" },
  { path: "/admin", login: /\/login$/, locale: "uz" },
  { path: "/dashboard/content", login: /\/login$/, locale: "uz" },
  { path: "/ru/", login: /\/ru\/login$/, locale: "ru" },
  // Regression for the matcher bug where a bare `products/` exclusion
  // shadowed these routes for the default locale — no next-intl rewrite and
  // no auth gate, so they 404'd instead of redirecting to /login.
  { path: "/products/comparisons", login: /\/login$/, locale: "uz" },
  { path: "/products/roadmap", login: /\/login$/, locale: "uz" },
  { path: "/products/technical-docs", login: /\/login$/, locale: "uz" },
  { path: "/ru/products/comparisons", login: /\/ru\/login$/, locale: "ru" },
  { path: "/ru/products/roadmap", login: /\/ru\/login$/, locale: "ru" },
  { path: "/ru/products/technical-docs", login: /\/ru\/login$/, locale: "ru" },
];

test.describe("auth gate without a session", () => {
  for (const { path, login, locale } of GATED_ROUTES) {
    test(`${path} redirects to the ${locale} login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(login);
      await expect(page.getByText(LOGIN_BUTTON[locale])).toBeVisible();
    });
  }
});

// Optional: a manager's session cookie captured locally (see docs/TESTING.md).
// Never set in CI — there is no automated Google sign-in.
const sessionCookie = process.env.TEST_SESSION_COOKIE;

function parseCookieHeader(header: string): { name: string; value: string }[] {
  return header
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.includes("="))
    .map((pair) => {
      const separator = pair.indexOf("=");
      return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
    });
}

async function expectStillOn(page: Page, path: RegExp): Promise<void> {
  await expect(page, "redirected away — TEST_SESSION_COOKIE is expired or not a manager's").toHaveURL(path);
}

test.describe("manager session (TEST_SESSION_COOKIE)", () => {
  test.skip(!sessionCookie, "TEST_SESSION_COOKIE is not set");

  test.beforeEach(async ({ context, baseURL }) => {
    const url = baseURL ?? "http://localhost:3000";
    await context.addCookies(parseCookieHeader(sessionCookie ?? "").map((cookie) => ({ ...cookie, url })));
  });

  test("/dashboard renders the KPI grid", async ({ page }) => {
    await page.goto("/dashboard");
    await expectStillOn(page, /\/dashboard$/);
    for (const title of ["Faol operatorlar", "Jami vaqt", "Nashr kutayotgan qoralamalar", "Natijasiz qidiruvlar"]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
  });

  test("/admin renders six section cards", async ({ page }) => {
    await page.goto("/admin");
    await expectStillOn(page, /\/admin$/);
    await expect(page.getByText(/^\d+ ta yozuv$/)).toHaveCount(6);
  });
});
