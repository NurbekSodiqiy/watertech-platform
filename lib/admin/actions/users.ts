"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSignInBlocked } from "@/lib/auth/ban";
import type { ActionResult } from "@/lib/admin/errors";
import type { AssignableRole } from "@/lib/admin/users";
import { requireAdminSession } from "./guard";
import { userAccessActions, type UserAccessDeps } from "./user-access";

// Thin Server Action surface over ./user-access.ts (the same split as
// versions.ts over restore.ts). Every argument is re-validated there with zod;
// the parameter types below are for the caller's editor, not trusted.

const liveUserAccessDeps: UserAccessDeps = {
  requireSession: requireAdminSession,
  // Allow-list writes run as the admin, under RLS and the 0017/0020 guard.
  client: () => createClient(),
  // Service-role client (CLAUDE.md §7), used for exactly one thing: Supabase
  // Auth's admin API, which bans or unbans an account and has no RLS-scoped
  // equivalent — a session may only ever change itself. It is reached only
  // after requireAdminSession() and a successful allow-list write under the
  // admin's own session, and the auth user id it looks up never leaves
  // lib/auth/ban.ts.
  setSignInBlocked: (email, blocked) => setSignInBlocked(createAdminClient().auth.admin, email, blocked),
};

/** Adds an active operator or sales-manager row (lowercased email).
 * `email_taken` when a row already exists — active or not. An admin row is
 * added in the SQL editor only. */
export async function addUser(email: string, role: AssignableRole, fullName: string | null): Promise<ActionResult> {
  return userAccessActions(liveUserAccessDeps).addUser(email, role, fullName);
}

/** Operator ↔ manager, effective at the person's next token refresh.
 * Refused with `admin_locked` for an admin row (SQL editor only), and — in
 * the database's order — `last_admin` / `self_change` before it. */
export async function setRole(email: string, role: AssignableRole): Promise<ActionResult> {
  return userAccessActions(liveUserAccessDeps).setRole(email, role);
}

/** Deactivates (and bans in Supabase Auth, so the session cannot be renewed)
 * or reactivates (and unbans). `auth_sync_failed` means the row changed but
 * the ban did not; calling it again retries the ban. */
export async function setActive(email: string, active: boolean): Promise<ActionResult> {
  return userAccessActions(liveUserAccessDeps).setActive(email, active);
}
