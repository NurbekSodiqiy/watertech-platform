import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  actionErrorResult,
  actionFailed,
  actionOk,
  allowListGuardCode,
  logDbError,
  PG_UNIQUE_VIOLATION,
  type ActionResult,
} from "@/lib/admin/errors";
import { adminErrorMap } from "@/lib/admin/validation";
import {
  accessViolation,
  addUserSchema,
  isUserRole,
  removeUserSchema,
  setActiveSchema,
  setRoleSchema,
  type AccessState,
} from "@/lib/admin/users";
import type { SignInBlockResult } from "@/lib/auth/ban";
import type { AccountDeleteResult } from "@/lib/auth/delete-account";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminSession } from "./guard";

// The allow-list writes behind /admin/users. Not a "use server" file, for the
// same reason as factory.ts and restore.ts: the dependencies come in as an
// argument, so tests/unit/admin/user-access.test.ts drives the real
// supabase-js query builder over a mocked fetch. lib/admin/actions/users.ts
// is the Server Action surface.
//
// Every rule here is checked twice. First in TS, from one read of the rows
// involved, so a refusal comes back as a precise code without a failed write;
// then by the database, whatever the TS decided:
//   * the allowed_users policies (0017, delete 0022) — admin JWT only
//     (is_manager() is is_admin() since 0020), and column grants that allow
//     role / is_active / full_name and nothing else;
//   * private.allowed_users_guard — WT403 when the caller's own row is no
//     longer an active admin (a stale admin token), WT460 last admin, WT461
//     self-change, WT462 any write that creates, promotes, demotes,
//     deactivates or removes an admin row (admin rows are SQL-editor-only),
//     all under one advisory lock;
//   * admin_purge_person_history (0022) — the same WT403 / WT461 / WT462
//     before it deletes a person's history.
// The writes go through the admin's own RLS-scoped session, never the service
// role. Only Supabase Auth — the ban, and deleting an account — needs that
// key, and both are dependencies so this file never touches it.

export type AccessDbClient = SupabaseClient<Database>;

export interface UserAccessDeps {
  /** Throws (AdminActionError "unauthorized") unless the caller is an admin. */
  requireSession: () => Promise<AdminSession>;
  /** RLS-scoped session client. */
  client: () => AccessDbClient;
  /** Bans (true) or unbans (false) every Supabase Auth account with this email. */
  setSignInBlocked: (email: string, blocked: boolean) => Promise<SignInBlockResult>;
  /** Deletes every Supabase Auth account with this email. */
  deleteAuthAccounts: (email: string) => Promise<AccountDeleteResult>;
}

export interface UserAccessActions {
  addUser: (email: unknown, role: unknown, fullName: unknown) => Promise<ActionResult>;
  setRole: (email: unknown, role: unknown) => Promise<ActionResult>;
  setActive: (email: unknown, active: unknown) => Promise<ActionResult>;
  removeUser: (email: unknown, purgeHistory: unknown, confirmEmail: unknown) => Promise<ActionResult>;
}

/** Postgres states a refused allow-list write (or history purge) can carry
 * besides the guard's own (lib/admin/errors.ts `allowListGuardCode`). */
const SQLSTATE = {
  insufficientPrivilege: "42501",
  checkViolation: "23514",
  invalidArgument: "WT400",
} as const;

interface AccessSnapshot {
  /** The row being changed, or null when there is none (or RLS hides it). */
  target: AccessState | null;
  /** Every active admin's email, lowercased. */
  activeAdmins: string[];
}

function writeFailure(scope: string, error: { message: string; code?: string }): ActionResult {
  logDbError(scope, error);
  if (error.code === PG_UNIQUE_VIOLATION) return actionFailed("email_taken", { field: "email" });

  const guarded = allowListGuardCode(error.code);
  if (guarded) return actionFailed(guarded);

  switch (error.code) {
    case SQLSTATE.insufficientPrivilege:
      return actionFailed("unauthorized");
    case SQLSTATE.checkViolation:
    case SQLSTATE.invalidArgument:
      return actionFailed("validation");
    default:
      return actionFailed("unknown");
  }
}

async function activeAdminEmails(supabase: AccessDbClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("role", "admin")
    .eq("is_active", true);
  if (error) {
    logDbError("allowed_users admins", error);
    throw new Error(error.message);
  }
  return data.map((row) => row.email.toLowerCase());
}

async function loadSnapshot(supabase: AccessDbClient, email: string): Promise<AccessSnapshot> {
  const [target, activeAdmins] = await Promise.all([
    supabase.from("allowed_users").select("role,is_active").eq("email", email).limit(1),
    activeAdminEmails(supabase),
  ]);
  if (target.error) {
    logDbError("allowed_users select", target.error);
    throw new Error(target.error.message);
  }

  const row = target.data[0];
  if (!row) return { target: null, activeAdmins };
  if (!isUserRole(row.role)) {
    // allowed_users_role_chk was NOT VALID until 0020, so a legacy row may
    // hold anything. It is not a state this page can reason about.
    console.error("[admin] allowed_users row with an unknown role");
    throw new Error("allowed_users: unknown role");
  }
  return { target: { role: row.role, isActive: row.is_active }, activeAdmins };
}

/** The TS pre-check shared by setRole, setActive and removeUser. `change`
 * gives the row as the action would leave it — null for a removal. Null means
 * "go ahead". */
function refusal(
  session: AdminSession,
  email: string,
  snapshot: AccessSnapshot,
  change: (before: AccessState) => AccessState | null
): ActionResult | null {
  const actor = session.email.toLowerCase();
  // The JWT said admin (requireSession); the allow-list has to agree right
  // now. An admin demoted or deactivated in the SQL editor in the last hour
  // still holds an admin token — this is the guard's WT403, asked before the
  // write.
  if (!snapshot.activeAdmins.includes(actor)) return actionFailed("unauthorized");
  if (!snapshot.target) return actionFailed("not_found");

  const violation = accessViolation({
    actor,
    target: email,
    before: snapshot.target,
    after: change(snapshot.target),
    activeAdmins: snapshot.activeAdmins,
  });
  return violation ? actionFailed(violation) : null;
}

/** The ban / unban after a successful write. A throw (the service-role key
 * missing from the environment, a network error) is a failed sync like any
 * other: the allow-list row is already written, and saying "unknown" would
 * hide that. */
async function syncSignIn(deps: UserAccessDeps, email: string, blocked: boolean): Promise<ActionResult> {
  let result: SignInBlockResult;
  try {
    result = await deps.setSignInBlocked(email, blocked);
  } catch (e) {
    // Never the email: lib/auth/ban.ts puts none in what it throws, and
    // lib/env.ts names a missing variable, never its value.
    console.error("[admin] sign-in block threw:", e instanceof Error ? e.message : "unknown");
    result = "failed";
  }
  return result === "failed" ? actionFailed("auth_sync_failed") : actionOk();
}

/** The Supabase Auth half of a removal. A throw (the service-role key missing,
 * a network error) is a failure like GoTrue's own. */
async function deleteAccounts(deps: UserAccessDeps, email: string): Promise<AccountDeleteResult> {
  try {
    return await deps.deleteAuthAccounts(email);
  } catch (e) {
    // Never the email: lib/auth/delete-account.ts puts none in what it throws.
    console.error("[admin] account delete threw:", e instanceof Error ? e.message : "unknown");
    return "failed";
  }
}

export function userAccessActions(deps: UserAccessDeps): UserAccessActions {
  /** Adds an active operator or sales manager row — `addUserSchema` accepts
   * nothing else, and the database refuses an admin row anyway (WT462). Also
   * lifts any Supabase Auth ban left on the email — a person removed by hand
   * in the SQL editor after a deactivation would otherwise be allow-listed and
   * still unable to sign in. */
  async function addUser(email: unknown, role: unknown, fullName: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const input = addUserSchema.parse({ email, role, fullName }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      const admins = await activeAdminEmails(supabase);
      if (!admins.includes(session.email.toLowerCase())) return actionFailed("unauthorized");

      // `.insert()`, never an upsert: an existing row is somebody's current
      // access, and "add" must not quietly re-role or reactivate it.
      const { error } = await supabase
        .from("allowed_users")
        .insert({ email: input.email, role: input.role, full_name: input.fullName, is_active: true });
      if (error) return writeFailure("allowed_users insert", error);

      return await syncSignIn(deps, input.email, false);
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  /** Operator ↔ manager. Takes effect at the person's next token refresh —
   * the claim in their current access token stays until it expires. An admin
   * row is neither a source nor a target (`admin_locked`). */
  async function setRole(email: unknown, role: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const input = setRoleSchema.parse({ email, role }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      const snapshot = await loadSnapshot(supabase, input.email);
      const refused = refusal(session, input.email, snapshot, (before) => ({ ...before, role: input.role }));
      if (refused) return refused;
      if (snapshot.target?.role === input.role) return actionOk();

      const { data, error } = await supabase
        .from("allowed_users")
        .update({ role: input.role })
        .eq("email", input.email)
        .select("email");
      if (error) return writeFailure("allowed_users role", error);
      if (data.length !== 1) return actionFailed("not_found");

      return actionOk();
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  /**
   * Deactivate: the row first — from then on the access-token hook refuses
   * every new token — then the Supabase Auth ban, which stops the refresh
   * token at once instead of at its next use. Reactivate: the row, then the
   * unban. The row goes first both ways because it is the authority: a row
   * that failed to change must not leave someone banned or unbanned against it.
   *
   * The Auth half runs even when the row is already in the requested state,
   * so repeating the action after an `auth_sync_failed` is the retry. It only
   * ever brings the ban in line with the row: deactivating or reactivating an
   * admin row is refused before it (`admin_locked`).
   */
  async function setActive(email: unknown, active: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const input = setActiveSchema.parse({ email, active }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      const snapshot = await loadSnapshot(supabase, input.email);
      const refused = refusal(session, input.email, snapshot, (before) => ({ ...before, isActive: input.active }));
      if (refused) return refused;

      if (snapshot.target?.isActive !== input.active) {
        const { data, error } = await supabase
          .from("allowed_users")
          .update({ is_active: input.active })
          .eq("email", input.email)
          .select("email");
        if (error) return writeFailure("allowed_users is_active", error);
        if (data.length !== 1) return actionFailed("not_found");
      }

      return await syncSignIn(deps, input.email, !input.active);
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  /**
   * Removes an operator or a sales manager — someone who left (0022). Every
   * step is idempotent and the allow-list row goes last, so repeating the
   * action after a failure at any step finishes the job: the row is what the
   * retry finds the person by.
   *
   *   1. Checks, nothing written: the admin session; zod, the typed
   *      confirmation included; the row (`not_found`); accessViolation's
   *      remove rules — last_admin, self_change, admin_locked, in the guard's
   *      order.
   *   2. The Supabase Auth account(s) deleted. `auth_sync_failed` if GoTrue
   *      does not confirm — and then nothing else has been touched.
   *   3. With `purgeHistory`, admin_purge_person_history (0022). An error
   *      leaves the row in place.
   *   4. The allow-list row, deleted through the admin's own session: the
   *      delete policy (0022) and the guard decide again, and the audit
   *      trigger records it in access_audit — which nothing here touches.
   *
   * Until step 4 succeeds the row is still active, so a person whose removal
   * failed after step 2 could sign in with Google again (a new Auth account)
   * until the retry deletes that one too.
   */
  async function removeUser(email: unknown, purgeHistory: unknown, confirmEmail: unknown): Promise<ActionResult> {
    try {
      const session = await deps.requireSession();
      const input = removeUserSchema.parse({ email, purgeHistory, confirmEmail }, { errorMap: adminErrorMap });
      const supabase = deps.client();

      const snapshot = await loadSnapshot(supabase, input.email);
      const refused = refusal(session, input.email, snapshot, () => null);
      if (refused) return refused;

      if ((await deleteAccounts(deps, input.email)) === "failed") return actionFailed("auth_sync_failed");

      if (input.purgeHistory) {
        const { error } = await supabase.rpc("admin_purge_person_history", { p_email: input.email });
        if (error) return writeFailure("admin_purge_person_history", error);
      }

      const { data, error } = await supabase
        .from("allowed_users")
        .delete()
        .eq("email", input.email)
        .select("email");
      if (error) return writeFailure("allowed_users delete", error);
      if (data.length !== 1) return actionFailed("not_found");

      return actionOk();
    } catch (e) {
      return actionErrorResult(e);
    }
  }

  return { addUser, setRole, setActive, removeUser };
}
