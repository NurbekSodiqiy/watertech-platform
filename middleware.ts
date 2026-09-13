import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";
import { homeForRole, isManagerArea, roleFromClaims } from "@/lib/auth/claims";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Logged once per process, not per request — a symmetric (HS256) project
// makes getClaims() fall back to a network call on every request, which
// defeats the point of this middleware.
let warnedAboutSymmetricKeys = false;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  const pathname = request.nextUrl.pathname;
  const role = roleFromClaims(claims);

  const isPublic = isPublicPath(pathname);

  if (isPublic) {
    if (pathname === "/login" && role !== null) {
      const url = request.nextUrl.clone();
      url.pathname = homeForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (role === null) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "error=not_allowed";
    return NextResponse.redirect(url);
  }

  // Managers are confined to manager areas, and manager areas are confined
  // to managers — this is the one role check for both directions, so a
  // request already sitting on /dashboard doesn't skip it.
  const wantsManagerArea = isManagerArea(pathname);
  const isManager = role === "manager";
  if (isManager !== wantsManagerArea) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|products/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json)$).*)",
  ],
};
