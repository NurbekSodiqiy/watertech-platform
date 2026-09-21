import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Signed-in e2e runs. CI has no Google sign-in (docs/TESTING.md), so every spec
 * that needs a session reads a cookie header captured by hand and skips itself
 * when the matching variable is unset.
 *
 * There are two, because middleware.ts confines each role to its own area: a
 * manager is redirected off `/`, `/products` and every other operator route,
 * so the manager cookie cannot stand in for the operator one.
 *
 *   TEST_OPERATOR_COOKIE — an operator's session; operator routes.
 *   TEST_SESSION_COOKIE  — a manager's session; /admin and /dashboard.
 *
 * Both are live sessions: treat them like passwords, never commit them, never
 * put them in CI secrets.
 */
export const operatorCookie = process.env.TEST_OPERATOR_COOKIE;
export const managerCookie = process.env.TEST_SESSION_COOKIE;

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
