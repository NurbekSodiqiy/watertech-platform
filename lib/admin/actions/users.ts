"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSignInBlocked } from "@/lib/auth/ban";
import type { ActionResult } from "@/lib/admin/errors";
import type { UserRole } from "@/lib/admin/users";
import { requireManagerSession } from "./guard";
import { userAccessActions, type UserAccessDeps } from "./user-access";

// Thin Server Action surface over ./user-access.ts (the same split as
// versions.ts over restore.ts). Every argument is re-validated there with zod;
// the parameter types below are for the caller's editor, not trusted.

const liveUserAccessDeps: UserAccessDeps = {
  requireSession: requireManagerSession,
  // Allow-list writes run as the manager, under RLS and the 0017 guard.
  client: () => createClient(),
  // Service-role client (CLAUDE.md §7), used for exactly one thing: Supabase
  // Auth's admin API, which bans or unbans an account and has no RLS-scoped
  // equivalent — a session may only ever change itself. It is reached only
  // after requireManagerSession() and a successful allow-list write under the
  // manager's own session, and the auth user id it looks up never leaves
  // lib/auth/ban.ts.
  setSignInBlocked: (email, blocked) => setSignInBlocked(createAdminClient().auth.admin, email, blocked),
};

/** Adds an active allow-list row (lowercased email). `email_taken` when a
 * row already exists — active or not. */
export async function addUser(email: string, role: UserRole, fullName: string | null): Promise<ActionResult> {
  return userAccessActions(liveUserAccessDeps).addUser(email, role, fullName);
}

/** Operator ↔ manager, effective at the person's next token refresh.
 * Refused with `self_change` for the caller's own row and `last_manager` for
 * the last active manager. */
export async function setRole(email: string, role: UserRole): Promise<ActionResult> {
  return userAccessActions(liveUserAccessDeps).setRole(email, role);
}

/** Deactivates (and bans in Supabase Auth, so the session cannot be renewed)
 * or reactivates (and unbans). `auth_sync_failed` means the row changed but
 * the ban did not; calling it again retries the ban. */
export async function setActive(email: string, active: boolean): Promise<ActionResult> {
  return userAccessActions(liveUserAccessDeps).setActive(email, active);
}
