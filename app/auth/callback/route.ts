import { NextResponse } from "next/server";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { homeForRole, roleFromClaims } from "@/lib/auth/claims";
import { localeOrDefault, localizedPath } from "@/lib/i18n/localized-path";

/** The `message` public.custom_access_token_hook returns when it refuses to
 * issue a token — see supabase/migrations/0014_role_gated_rls.sql. GoTrue
 * propagates a Postgres hook's `http_code` and `message` verbatim, so the
 * refusal arrives here as an AuthError with status 403 and this message. */
const HOOK_DENIED_MESSAGE = "not_allowed";

/** True when the exchange failed because the allow-list refused this account,
 * rather than because the PKCE exchange itself broke. Matches on either half
 * of the hook's response: the status survives any future wording change, the
 * sentinel survives GoTrue mapping the status differently. Every other 403
 * from the token endpoint (a banned user, for instance) also means "not
 * allowed to be here", so treating it the same way is correct. */
function deniedByAllowList(error: AuthError): boolean {
  return error.status === 403 || error.message.includes(HOOK_DENIED_MESSAGE);
}

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
    // Every branch here lands on the same ?error=not_allowed page on purpose —
    // the browser must not learn *why* it was refused. The two are told apart
    // in the server log instead, which is the whole point of these two lines:
    // "the allow-list said no" is an expected event with a known cause, while
    // a failed PKCE exchange is an operational problem worth chasing.
    if (deniedByAllowList(error)) {
      // Since 0014 the access-token hook refuses outright, so no JWT was ever
      // signed — there is nothing to sign out and nothing that could be
      // replayed against PostgREST. Status and code only: the account being
      // refused is exactly the thing not to write to a log.
      console.warn(
        `[auth/callback] allow-list refused the sign-in — the access-token hook issued no token (status ${error.status ?? "?"}, code ${error.code ?? "none"})`
      );
    } else {
      // GoTrue's own message, which carries no user identity.
      console.error(
        `[auth/callback] exchangeCodeForSession failed (status ${error.status ?? "?"}, code ${error.code ?? "none"}): ${error.message}`
      );
    }
    return redirectTo("/login", "?error=not_allowed");
  }

  // The allow-list lookup already happened in the Custom Access Token Hook
  // when this session's JWT was issued — the role claim on it is the answer.
  // Since 0014 a token without a valid role cannot be issued at all, so this
  // is the fail-safe for the two cases that outlive the migration: the hook
  // not (yet) enabled in Dashboard -> Authentication -> Hooks, and a token
  // minted before 0014 that still carries role "none".
  const { data: claimsData } = await supabase.auth.getClaims();
  const role = roleFromClaims(claimsData?.claims);

  if (!role) {
    console.warn(
      "[auth/callback] session has no operator/manager/admin role claim — is the Custom Access Token hook enabled?"
    );
    await supabase.auth.signOut();
    return redirectTo("/login", "?error=not_allowed");
  }

  return redirectTo(homeForRole(role));
}
