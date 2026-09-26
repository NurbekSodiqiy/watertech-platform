import "server-only";
import type { GoTrueAdminApi, User } from "@supabase/supabase-js";

// Finding Supabase Auth accounts by email, for the two things /admin/users does
// to them through the admin API: ban / unban (lib/auth/ban.ts) and delete
// (lib/auth/delete-account.ts). The admin API (supabase-js 2.116 / auth-js
// GoTrueAdminApi) has no lookup by email, so the accounts are found by paging
// listUsers.
//
// Takes the admin API as an argument, like its two callers: the caller of
// those (lib/admin/actions/users.ts) owns the service-role client and its
// justification (CLAUDE.md §7), and the tests pass a fake.
//
// Never logged: the email, and any auth user id.

/** 1000 per page is the size the Supabase docs page with; MAX_PAGES caps the
 * walk so a runaway pagination can never hang a Server Action. ~30 users
 * here, so one page in practice. */
export const AUTH_USERS_PER_PAGE = 1000;
export const AUTH_USERS_MAX_PAGES = 50;

export type AuthUserLister = Pick<GoTrueAdminApi, "listUsers">;

/** One failure line for the server log: what was being done, and GoTrue's
 * status and error code — never a message, an email or an id. */
export function logAuthAdminFailure(step: string, error: { status?: number; code?: string } | null): void {
  console.error(`[auth] ${step}:`, error?.status ?? "", error?.code ?? "");
}

/**
 * Every auth user whose email matches, compared lowercased (`email` is trimmed
 * and lowercased here too); null when the listing failed or did not finish.
 * More than one is possible (an SSO and a non-SSO identity may share an
 * address), and each caller handles every one. `scope` names the caller in the
 * log line ("sign-in block", "account delete").
 */
export async function findAuthUsersByEmail(
  admin: AuthUserLister,
  email: string,
  scope: string
): Promise<User[] | null> {
  const wanted = email.trim().toLowerCase();
  const matches: User[] = [];

  for (let page = 1; page <= AUTH_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: AUTH_USERS_PER_PAGE });
    if (error) {
      logAuthAdminFailure(`${scope} list`, error);
      return null;
    }

    matches.push(...data.users.filter((user) => user.email?.toLowerCase() === wanted));

    // Done on an empty page, or on a short one GoTrue says is the last. A full
    // page always asks for the next, in case the server capped per_page below
    // what was requested.
    if (data.users.length === 0) return matches;
    if (data.users.length < AUTH_USERS_PER_PAGE && data.nextPage === null) return matches;
  }

  logAuthAdminFailure(`${scope} list (page limit reached)`, null);
  return null;
}
