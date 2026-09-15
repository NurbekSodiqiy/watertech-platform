import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { clientEnv } from "@/lib/env";
import { homeForRole, isManagerArea, roleFromClaims } from "@/lib/auth/claims";
import { routing } from "@/i18n/routing";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

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

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // Carry over next-intl's locale-resolution headers — otherwise
          // rebuilding the response here would silently drop them.
          intlResponse.headers.forEach((value, key) => response.headers.set(key, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
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
    return NextResponse.redirect(url);
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

  if (role === null) {
    return redirectTo("/login", "error=not_allowed");
  }

  // Managers are confined to manager areas, and manager areas are confined
  // to managers — this is the one role check for both directions, so a
  // request already sitting on /dashboard doesn't skip it.
  const wantsManagerArea = isManagerArea(pathname);
  const isManager = role === "manager";
  if (isManager !== wantsManagerArea) {
    return redirectTo(homeForRole(role));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|products/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json)$).*)",
  ],
};
