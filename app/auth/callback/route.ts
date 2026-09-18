import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeForRole, roleFromClaims } from "@/lib/auth/claims";
import { localeOrDefault, localizedPath } from "@/lib/i18n/localized-path";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Set by GoogleSignInButton on redirectTo. The only caller-supplied input
  // that shapes the redirect, and only after it matches routing.locales —
  // every target below is `origin` + a fixed app path, so there is no way to
  // steer the redirect to another path or host (no open redirect).
  const locale = localeOrDefault(searchParams.get("locale"));

  function redirectTo(pathname: string, search = "") {
    return NextResponse.redirect(`${origin}${localizedPath(pathname, locale)}${search}`);
  }

  if (!code) {
    console.warn("[auth/callback] no ?code in the request — nothing to exchange");
    return redirectTo("/login", "?error=not_allowed");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Redirecting to the same ?error=not_allowed as the role check below is
    // deliberate (don't reveal *why* to the client), but that means this
    // branch — the code/PKCE exchange itself failing, unrelated to the
    // allow-list — would otherwise look identical from the browser.
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return redirectTo("/login", "?error=not_allowed");
  }

  // The allow-list lookup already happened in the Custom Access Token Hook
  // when this session's JWT was issued — the role claim on it is the answer.
  const { data: claimsData } = await supabase.auth.getClaims();
  const role = roleFromClaims(claimsData?.claims);

  if (!role) {
    await supabase.auth.signOut();
    return redirectTo("/login", "?error=not_allowed");
  }

  return redirectTo(homeForRole(role));
}
