import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { clientEnv } from "@/lib/env";
import { homeForRole, isAdminArea, isAdminRole, roleFromClaims } from "@/lib/auth/claims";
import { routing } from "@/i18n/routing";

// /offline is public because the service worker precaches it at install time,
// and that request doesn't necessarily carry the session cookie — gating it
// would cache a redirect to /login as the offline fallback. The page holds no
// user data.
const PUBLIC_PATHS = ["/login", "/offline"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const handleI18nRouting = createIntlMiddleware(routing);

/** Strips a known non-default locale prefix off a raw request pathname,
 * returning the locale it resolved to (falling back to the default) and the
 * locale-less pathname the existing auth checks below already run against. */
function localeAndPathname(pathname: string): { locale: string; pathname: string } {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return { locale, pathname: "/" };
    if (pathname.startsWith(`/${locale}/`)) return { locale, pathname: pathname.slice(locale.length + 1) };
  }
  return { locale: routing.defaultLocale, pathname };
}

function withLocale(pathname: string, locale: string): string {
  return locale === routing.defaultLocale ? pathname : `/${locale}${pathname}`;
}

// Logged once per process, not per request — a symmetric (HS256) project
// makes getClaims() fall back to a network call on every request, which
// defeats the point of this middleware.
let warnedAboutSymmetricKeys = false;

export async function middleware(request: NextRequest) {
  // Resolves the locale and any next-intl rewrite/redirect first, as the
  // rest of this middleware's pathname logic depends on it.
  const intlResponse = handleI18nRouting(request);
  if (intlResponse.headers.get("location")) {
    // Locale-prefix canonicalization (e.g. /uz/... -> /... for the default
    // locale) — return it as-is; auth re-runs on the follow-up request.
    return intlResponse;
  }

  let response = intlResponse;

  // Everything setAll() wrote during this request (a refreshed session), kept
  // so redirectTo() can replay it — a bare NextResponse.redirect() would
  // otherwise drop the new tokens and the browser keeps the stale ones.
  let refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];
  let refreshedHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          refreshedCookies = cookiesToSet;
          refreshedHeaders = headers;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // Carry over next-intl's locale-resolution headers — otherwise
          // rebuilding the response here would silently drop them.
          intlResponse.headers.forEach((value, key) => response.headers.set(key, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // Cache-Control: private/no-store — a response carrying a session
          // cookie must never be cached by a shared cache.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (process.env.NODE_ENV !== "production" && !warnedAboutSymmetricKeys && data?.header?.alg === "HS256") {
    warnedAboutSymmetricKeys = true;
    console.warn(
      "Supabase project still uses symmetric JWT keys — getClaims() falls back to a network call. Migrate to ECC signing keys."
    );
  }

  const { locale, pathname } = localeAndPathname(request.nextUrl.pathname);
  const role = roleFromClaims(claims);

  function redirectTo(targetPathname: string, search = "") {
    const url = request.nextUrl.clone();
    url.pathname = withLocale(targetPathname, locale);
    url.search = search;
    const redirect = NextResponse.redirect(url);
    refreshedCookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
    Object.entries(refreshedHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
    return redirect;
  }

  const isPublic = isPublicPath(pathname);

  if (isPublic) {
    if (pathname === "/login" && role !== null) {
      return redirectTo(homeForRole(role));
    }
    return response;
  }

  if (!claims) {
    return redirectTo("/login");
  }

  // A session whose JWT carries no operator/manager/admin role claim. Since
  // migration 0014 the access-token hook refuses to issue such a token at all,
  // so this is a fail-safe, not the main gate: it still catches a token minted
  // before 0014 (role "none"), and the case where the Custom Access Token hook
  // is not enabled in the Supabase dashboard. It stays network-free either way
  // — the answer is read off the locally verified JWT (CLAUDE.md section 4).
  if (role === null) {
    return redirectTo("/login", "error=not_allowed");
  }

  // Role model v2 (CLAUDE.md §7): the admin panel — /admin and /dashboard —
  // is the admin's alone, and this is the one check that keeps an operator or
  // a sales manager out of it, bounced to their home (the operator app). It
  // is one-directional on purpose: the admin may also open every operator
  // route, to preview what operators see. The admin layout, every /dashboard
  // page, every admin Server Action and RLS each refuse a non-admin again on
  // their own, so this is the first layer, not the only one.
  if (isAdminArea(pathname) && !isAdminRole(role)) {
    return redirectTo(homeForRole(role));
  }

  return response;
}

// sw.js and manifest.webmanifest are excluded because neither is fetched as a
// normal page: the browser requests the manifest without credentials, and a
// service worker script must be served from the origin root unredirected — a
// locale rewrite or an auth redirect on either one breaks installation.
// /auth/callback is a locale-less Route Handler (app/auth/callback) like
// /api/*: next-intl would rewrite it to /uz/auth/callback, which doesn't
// exist (404), and it needs no auth gate — it establishes the session itself.
// /monitoring is the Sentry tunnel (next.config.js tunnelRoute): a rewrite
// Sentry adds that forwards the browser SDK's error envelopes to the ingest
// host. A locale rewrite or an auth redirect on it would swallow the reports.
// The `(?:/|$)` boundary keeps that exclusion to exactly /monitoring and
// /monitoring/*, not every path that merely starts with "monitoring".
// No `products/` or `fonts/` prefix exclusion: catalog images under
// public/products/*.jpg are excluded by the file-extension alternative below,
// and app/fonts/InterVariable.woff2 is loaded through next/font (bundled at
// build time), never served from a /fonts/ URL — a prefix exclusion here only
// shadowed the real pages at /products/comparisons, /products/roadmap and
// /products/technical-docs, bypassing both the next-intl rewrite and the auth
// gate for the default locale.
// The file-extension alternative is scoped to the three folders public/
// actually has (certificates/, icons/, products/ — flat, no subfolders), and
// the three single files are anchored with `$`. Unscoped, a trailing
// `.json`/`.png`/`.map`… on ANY path skipped this middleware: under a dynamic
// segment (/sales-process/scripts/x.json, /tools/amocrm/x.map) an anonymous
// visitor got the operator shell rendered around a not-found body, and every
// such URL — or /sw.js<anything>, /favicon<any>ico… — wrote a new ISR cache
// entry, unauthenticated and unbounded (Audit-2).
// This literal is duplicated as MIDDLEWARE_MATCHER in
// lib/security/middleware-matcher.ts (Next.js statically analyses this
// export, so it must stay a string literal here) — keep both in sync;
// tests/unit/security/middleware-matcher-parity.test.ts enforces it.
export const config = {
  matcher: [
    "/((?!api/|auth/callback|monitoring(?:/|$)|_next/static|_next/image|favicon\\.ico$|sw\\.js$|manifest\\.webmanifest$|(?:certificates|icons|products)/[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json|webmanifest|map)$).*)",
  ],
};
