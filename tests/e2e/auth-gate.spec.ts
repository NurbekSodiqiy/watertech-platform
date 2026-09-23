import { test, expect, type Page } from "@playwright/test";

// Unauthenticated: middleware must send every gated route to the login page of
// the same locale, with no error query (that one is for signed-in users who
// aren't on the allow-list).

const LOGIN_BUTTON = { uz: "Google bilan kirish", ru: "Войти через Google" } as const;

const GATED_ROUTES: { path: string; login: RegExp; locale: keyof typeof LOGIN_BUTTON }[] = [
  { path: "/", login: /\/login$/, locale: "uz" },
  { path: "/admin", login: /\/login$/, locale: "uz" },
  { path: "/admin/users", login: /\/login$/, locale: "uz" },
  { path: "/ru/admin/users", login: /\/ru\/login$/, locale: "ru" },
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
  // Regression for the matcher's unscoped file-extension exclusion: a trailing
  // `.json`/`.webp`/`.map` skipped middleware on any path, so these rendered
  // the operator shell (in its not-found state) to an anonymous visitor and
  // wrote a fresh ISR cache entry per URL.
  { path: "/sales-process/scripts/lead-orqali-tushgan.json", login: /\/login$/, locale: "uz" },
  { path: "/ru/sales-process/battle-cards/alfa-therm.webp", login: /\/ru\/login$/, locale: "ru" },
  { path: "/tools/amocrm/lead-creation.map", login: /\/login$/, locale: "uz" },
  { path: "/admin/faq/x.png", login: /\/login$/, locale: "uz" },
  { path: "/x.json", login: /\/login$/, locale: "uz" },
];

// The other half of the matcher: what it still excludes must keep being served
// to a browser with no session — the service worker, the PWA manifest and the
// three public/ asset folders. A redirect here would break installation and
// every catalog image.
const PUBLIC_ASSETS: { path: string; type: RegExp }[] = [
  { path: "/sw.js", type: /javascript/ },
  { path: "/manifest.webmanifest", type: /manifest\+json|json/ },
  { path: "/icons/icon-192.png", type: /image\/png/ },
  { path: "/certificates/sertifikat-atl-asosiy.png", type: /image\/png/ },
  { path: "/products/truba-ppr.jpg", type: /image\/jpeg/ },
];

test.describe("auth gate without a session", () => {
  for (const { path, login, locale } of GATED_ROUTES) {
    test(`${path} redirects to the ${locale} login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(login);
      await expect(page.getByText(LOGIN_BUTTON[locale])).toBeVisible();
    });
  }

  for (const { path, type } of PUBLIC_ASSETS) {
    test(`${path} is served without a session`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"] ?? "").toMatch(type);
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

  // Read-only: nothing here writes the allow-list.
  test("/admin/users lists the allow-list and locks the manager's own row", async ({ page }) => {
    await page.goto("/admin/users");
    await expectStillOn(page, /\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Foydalanuvchilar va kirish huquqi" })).toBeVisible();
    const ownRow = page.getByRole("row").filter({ hasText: "Siz" });
    await expect(ownRow).toHaveCount(1);
    await expect(ownRow.getByRole("combobox")).toBeDisabled();
    await expect(ownRow.getByRole("button", { name: "To'xtatish" })).toBeDisabled();
  });
});
