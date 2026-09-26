import "server-only";
import type { GoTrueAdminApi } from "@supabase/supabase-js";
import { findAuthUsersByEmail, logAuthAdminFailure } from "./find-auth-users";

// Ending an operator's access in Supabase Auth itself, on top of the
// allow-list. Deactivating a row already makes the access-token hook refuse
// their next token (0014), but only when the hook is enabled and only at the
// next refresh. A ban is enforced by GoTrue itself, hook or no hook: the
// refresh-token grant answers "Invalid Refresh Token: User Banned" and an
// OAuth sign-in answers 403 "User is banned" (supabase/auth
// internal/tokens/service.go, internal/api/external.go). What neither can
// reach is the access token already in their browser — see
// docs/SECURITY.md §4 for that window.
//
// The method is the documented one (supabase-js 2.116 / auth-js
// GoTrueAdminApi): updateUserById(uid, { ban_duration }) where "none" lifts
// the ban. There is no lookup by email in the admin API, so the account is
// found by paging listUsers (./find-auth-users.ts, shared with
// ./delete-account.ts).
//
// Takes the admin API as an argument rather than importing the service-role
// client: the caller (lib/admin/actions/users.ts) owns that decision and its
// justification (CLAUDE.md §7), and tests/unit/auth/ban.test.ts passes a fake.
//
// Never logged: the email, and the auth user id — which also never leaves
// this module (the result is a status, not a user).

/** "Until a manager reactivates them": the 100 years Supabase's own docs use. */
export const SIGN_IN_BAN_DURATION = "876000h";
const LIFT_BAN = "none";

export type SignInBlockAdmin = Pick<GoTrueAdminApi, "listUsers" | "updateUserById">;

/** `applied`: every auth account with this email is now in the requested
 * state. `no_account`: nobody has signed in with it yet — nothing to do, and
 * the allow-list alone governs their first sign-in. `failed`: GoTrue did not
 * confirm; the caller reports it and a retry repeats the whole thing. */
export type SignInBlockResult = "applied" | "no_account" | "failed";

/**
 * Bans (`blocked = true`) or unbans every Supabase Auth account with this
 * email. A ban is always (re)applied, so a retry after a partial failure — or
 * a shorter ban someone set by hand — ends as the full-length one; an unban
 * only touches accounts that carry a ban at all.
 */
export async function setSignInBlocked(
  admin: SignInBlockAdmin,
  email: string,
  blocked: boolean
): Promise<SignInBlockResult> {
  const users = await findAuthUsersByEmail(admin, email, "sign-in block");
  if (users === null) return "failed";
  if (users.length === 0) return "no_account";

  let failed = false;
  for (const user of users) {
    if (!blocked && !user.banned_until) continue;
    const { error } = await admin.updateUserById(user.id, {
      ban_duration: blocked ? SIGN_IN_BAN_DURATION : LIFT_BAN,
    });
    if (error) {
      logAuthAdminFailure(blocked ? "sign-in block ban" : "sign-in block unban", error);
      failed = true;
    }
  }

  return failed ? "failed" : "applied";
}
