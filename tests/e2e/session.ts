import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Signed-in e2e runs. CI has no Google sign-in (docs/TESTING.md), so every spec
 * that needs a session reads a cookie header captured by hand and skips itself
 * when the matching variable is unset.
 *
 * One per role (role model v2, CLAUDE.md §7). middleware.ts keeps operators
 * and sales managers out of /admin and /dashboard; the admin may open the
 * operator routes too, but only as a preview (no telemetry, admin-only menu
 * items), so operator specs still run as an operator.
 *
 *   TEST_OPERATOR_COOKIE — an operator's session; operator routes.
 *   TEST_SESSION_COOKIE  — the admin's session; /admin and /dashboard. (The
 *                          name predates the admin role and is kept so local
 *                          setups keep working.)
 *   TEST_MANAGER_COOKIE  — a sales manager's session, optional; the redirects
 *                          that keep a manager out of the admin panel.
 *
 * All are live sessions: treat them like passwords, never commit them, never
 * put them in CI secrets.
 */
export const operatorCookie = process.env.TEST_OPERATOR_COOKIE;
export const adminCookie = process.env.TEST_SESSION_COOKIE;
export const salesManagerCookie = process.env.TEST_MANAGER_COOKIE;

export function parseCookieHeader(header: string): { name: string; value: string }[] {
  return header
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.includes("="))
    .map((pair) => {
      const separator = pair.indexOf("=");
      return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
    });
}

export async function applySession(context: BrowserContext, header: string, baseURL?: string): Promise<void> {
  const url = baseURL ?? "http://localhost:3000";
  await context.addCookies(parseCookieHeader(header).map((cookie) => ({ ...cookie, url })));
}

/**
 * Installs the operator session for the enclosing describe block and skips it
 * when `TEST_OPERATOR_COOKIE` is unset. Call it at the top of a
 * `test.describe()` body.
 */
export function useOperatorSession(): void {
  test.skip(!operatorCookie, "TEST_OPERATOR_COOKIE is not set");

  test.beforeEach(async ({ context, baseURL }) => {
    await applySession(context, operatorCookie ?? "", baseURL);
  });
}

/** The admin counterpart of `useOperatorSession` — skips when
 * `TEST_SESSION_COOKIE` is unset. Call it at the top of a `test.describe()`
 * body for a spec that needs `/admin` or `/dashboard`. */
export function useAdminSession(): void {
  test.skip(!adminCookie, "TEST_SESSION_COOKIE is not set");

  test.beforeEach(async ({ context, baseURL }) => {
    await applySession(context, adminCookie ?? "", baseURL);
  });
}

/** A sales manager's session — skips when `TEST_MANAGER_COOKIE` is unset. */
export function useSalesManagerSession(): void {
  test.skip(!salesManagerCookie, "TEST_MANAGER_COOKIE is not set");

  test.beforeEach(async ({ context, baseURL }) => {
    await applySession(context, salesManagerCookie ?? "", baseURL);
  });
}

/** Fails loudly rather than passing an empty assertion when the cookie has
 * expired or belongs to the wrong role and middleware bounced the request. */
export async function expectSignedInAt(page: Page, path: RegExp): Promise<void> {
  await expect(page, "redirected away — the session cookie is expired or has the wrong role").toHaveURL(path);
}

/** Console errors seen on a page, for the "no console errors" assertions.
 * Attach before `page.goto`. Next.js dev-only warnings never appear here: the
 * e2e suite runs against `npm run start`. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
