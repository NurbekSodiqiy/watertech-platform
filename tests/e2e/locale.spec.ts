import { test, expect } from "@playwright/test";
import { expectSignedInAt, useOperatorSession } from "./session";

/**
 * next-intl routing: `localePrefix: "as-needed"`, so uz is unprefixed and ru
 * lives under /ru. Two things must hold — switching language keeps you on the
 * page you were reading, and every section actually has Russian copy — plus
 * the sign-in round trip, which carries the locale through Supabase and back
 * out of /auth/callback.
 *
 * The Russian strings come from messages/ru.json and are asserted verbatim, so
 * a section whose copy silently falls back to Uzbek fails here.
 */
interface Section {
  path: string;
  ru: string;
  /** A Russian string this page must show. `heading` ones are the page's own
   * <h1>; `text` is for the scripts workspace, which has no page heading. */
  ruCopy: string;
  as?: "heading" | "text";
}

const SECTIONS: Section[] = [
  // nav.*.title (SectionLanding / PageHeader)
  { path: "/company", ru: "/ru/company", ruCopy: "Компания" },
  { path: "/sales-process", ru: "/ru/sales-process", ruCopy: "Процесс продаж" },
  { path: "/tools", ru: "/ru/tools", ruCopy: "Программы и инструменты" },
  { path: "/logistics", ru: "/ru/logistics", ruCopy: "Логистика" },
  { path: "/standards", ru: "/ru/standards", ruCopy: "Стандарты, KPI и мотивация" },
  { path: "/faq", ru: "/ru/faq", ruCopy: "Вопросы и ответы" },
  { path: "/changelog", ru: "/ru/changelog", ruCopy: "История изменений" },
  // pages.products.catalog.title — this page titles itself, not from nav
  { path: "/products", ru: "/ru/products", ruCopy: "Каталог продуктов" },
  // The scripts workspace renders no <h1>; scripts.quickObjections is always on it
  { path: "/sales-process/scripts", ru: "/ru/sales-process/scripts", ruCopy: "Быстрые возражения:", as: "text" },
];

// LocaleSwitcher's buttons carry the language's own name (chrome.localeSwitcher).
const RU_BUTTON = { uz: "Ruscha", ru: "Русский" } as const;
const UZ_BUTTON = { uz: "O'zbekcha", ru: "Узбекский" } as const;

test.describe("locale switching", () => {
  useOperatorSession();

  for (const section of SECTIONS) {
    test(`${section.path}: switching to ru keeps the route and shows Russian copy`, async ({ page }) => {
      await page.goto(section.path);
      // (\?|$): the scripts workspace restores the saved position into the
      // query string right after mount, so the path may pick up search params.
      await expectSignedInAt(page, new RegExp(`${section.path}(\?|$)`));

      await page.getByRole("button", { name: RU_BUTTON.uz }).click();

      // Same route, /ru prefix added — not bounced to the Russian home page.
      await expect(page).toHaveURL(new RegExp(`${section.ru}(\?|$)`));
      const copy =
        section.as === "text"
          ? page.getByText(section.ruCopy, { exact: true })
          : page.getByRole("heading", { name: section.ruCopy, exact: true });
      await expect(copy.first()).toBeVisible();
      await expect(page.getByRole("button", { name: UZ_BUTTON.ru })).toBeVisible();
    });
  }

  test("switching back to uz returns to the unprefixed route", async ({ page }) => {
    await page.goto("/ru/faq");
    await expectSignedInAt(page, /\/ru\/faq$/);

    await page.getByRole("button", { name: UZ_BUTTON.ru }).click();
    await expect(page).toHaveURL(/localhost:3000\/faq$/);
  });
});

// Unauthenticated: the sign-in round trip itself. No Google account is needed
// for either half — the browser's outgoing authorize request and the
// callback's own redirect are both observable without one.
test.describe("sign-in keeps the locale", () => {
  test("/ru/login sends locale=ru to /auth/callback as the OAuth redirect target", async ({ page }) => {
    let redirectTarget: string | null = null;

    // Supabase's /auth/v1/authorize is a top-level navigation to Google; stop
    // it at the browser and read the redirect_to it was given.
    await page.route("**/auth/v1/authorize**", async (route) => {
      redirectTarget = new URL(route.request().url()).searchParams.get("redirect_to");
      await route.abort();
    });

    await page.goto("/ru/login");
    await page.getByRole("button", { name: "Войти через Google" }).click();

    await expect.poll(() => redirectTarget, { message: "no OAuth authorize request" }).not.toBeNull();
    const target = new URL(redirectTarget ?? "");
    expect(target.pathname).toBe("/auth/callback");
    expect(target.searchParams.get("locale")).toBe("ru");
  });

  test("/auth/callback?locale=ru redirects back into /ru", async ({ page }) => {
    // No ?code, so the exchange never runs and the route takes its refusal
    // path — which still has to land in the locale it was called with.
    const response = await page.goto("/auth/callback?locale=ru");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/ru\/login\?error=not_allowed$/);
    await expect(page.getByText("Войти через Google")).toBeVisible();
  });

  test("/auth/callback with no locale falls back to uz", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/localhost:3000\/login\?error=not_allowed$/);
    await expect(page.getByText("Google bilan kirish")).toBeVisible();
  });
});
