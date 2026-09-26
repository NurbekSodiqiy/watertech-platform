import "server-only";
import type { GoTrueAdminApi } from "@supabase/supabase-js";
import { findAuthUsersByEmail, logAuthAdminFailure } from "./find-auth-users";

// Removing a person from /admin/users ends with their Supabase Auth account(s)
// deleted, not only banned: the Google identity is unlinked, every session and
// refresh token goes with the account (GoTrue deletes them with the user), and
// if the email is ever added again its first sign-in creates a fresh account.
// What no deletion reaches is the access token already in their browser — see
// docs/SECURITY.md §4 for that window.
//
// The method is the documented one (supabase-js 2.116 / auth-js
// GoTrueAdminApi): deleteUser(uid) — a hard delete (shouldSoftDelete false).
// The accounts are found by paging listUsers (./find-auth-users.ts, shared
// with ./ban.ts).
//
// Takes the admin API as an argument, like ./ban.ts: the caller
// (lib/admin/actions/users.ts) owns the service-role client and its
// justification (CLAUDE.md §7), and tests/unit/auth/delete-account.test.ts
// passes a fake.
//
// Never logged: the email, and the auth user id — which also never leaves
// this module (the result is a status, not a user).

export type AccountDeleteAdmin = Pick<GoTrueAdminApi, "listUsers" | "deleteUser">;

/** `applied`: no auth account with this email exists any more. `no_account`:
 * none existed — the person never signed in — so there was nothing to do.
 * `failed`: GoTrue did not confirm; the caller reports it, and a retry repeats
 * the whole thing (an account deleted by the first attempt is simply no longer
 * found). */
export type AccountDeleteResult = "applied" | "no_account" | "failed";

/** GoTrue's answer for an id that no longer exists: someone (a concurrent
 * removal, the dashboard) deleted it between the listing and this call. */
function alreadyGone(error: { status?: number; code?: string }): boolean {
  return error.status === 404 || error.code === "user_not_found";
}

/**
 * Deletes every Supabase Auth account whose email matches `email`
 * case-insensitively. Every match is attempted even after one fails, so a
 * retry has as little left to do as possible.
 */
export async function deleteAuthAccounts(admin: AccountDeleteAdmin, email: string): Promise<AccountDeleteResult> {
  const users = await findAuthUsersByEmail(admin, email, "account delete");
  if (users === null) return "failed";
  if (users.length === 0) return "no_account";

  let failed = false;
  for (const user of users) {
    const { error } = await admin.deleteUser(user.id);
    if (error && !alreadyGone(error)) {
      logAuthAdminFailure("account delete", error);
      failed = true;
    }
  }

  return failed ? "failed" : "applied";
}
