import "server-only";
import type { GoTrueAdminApi, User } from "@supabase/supabase-js";

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
// found by paging listUsers.
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

/** 1000 per page is the size the Supabase docs page with; MAX_PAGES caps the
 * walk so a runaway pagination can never hang a Server Action. ~30 users
 * here, so one page in practice. */
const PER_PAGE = 1000;
const MAX_PAGES = 50;

export type SignInBlockAdmin = Pick<GoTrueAdminApi, "listUsers" | "updateUserById">;

/** `applied`: every auth account with this email is now in the requested
 * state. `no_account`: nobody has signed in with it yet — nothing to do, and
 * the allow-list alone governs their first sign-in. `failed`: GoTrue did not
 * confirm; the caller reports it and a retry repeats the whole thing. */
export type SignInBlockResult = "applied" | "no_account" | "failed";

function logFailure(step: string, error: { status?: number; code?: string } | null): void {
  console.error(`[auth] sign-in block ${step}:`, error?.status ?? "", error?.code ?? "");
}

/** Every auth user whose email matches, compared lowercased; null when the
 * listing failed or did not finish. More than one is possible (an SSO and a
 * non-SSO identity may share an address), and each is handled. */
async function findAuthUsers(admin: SignInBlockAdmin, email: string): Promise<User[] | null> {
  const matches: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: PER_PAGE });
    if (error) {
      logFailure("list", error);
      return null;
    }

    matches.push(...data.users.filter((user) => user.email?.toLowerCase() === email));

    // Done on an empty page, or on a short one GoTrue says is the last. A full
    // page always asks for the next, in case the server capped per_page below
    // what was requested.
    if (data.users.length === 0) return matches;
    if (data.users.length < PER_PAGE && data.nextPage === null) return matches;
  }

  logFailure("list (page limit reached)", null);
  return null;
}

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
  const users = await findAuthUsers(admin, email.trim().toLowerCase());
  if (users === null) return "failed";
  if (users.length === 0) return "no_account";

  let failed = false;
  for (const user of users) {
    if (!blocked && !user.banned_until) continue;
    const { error } = await admin.updateUserById(user.id, {
      ban_duration: blocked ? SIGN_IN_BAN_DURATION : LIFT_BAN,
    });
    if (error) {
      logFailure(blocked ? "ban" : "unban", error);
      failed = true;
    }
  }

  return failed ? "failed" : "applied";
}
