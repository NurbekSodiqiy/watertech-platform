import { z } from "zod";

// The allow-list (public.allowed_users) as /admin/users edits it: the input
// schemas the add-user dialog and the Server Actions both parse, the row shape
// the page renders, and the one rule both TS and SQL enforce before a write.
// No server imports — the dialog validates with the same schemas the action
// re-validates with.

/** Every role an allow-list row can hold (allowed_users_role_chk, 0020). */
export const USER_ROLES = ["operator", "manager", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** The roles /admin/users may give. An admin row is created, changed and
 * removed in the Supabase SQL editor only — the database refuses any API
 * write that touches one (WT462, 0020), so the page never offers it. */
export const ASSIGNABLE_ROLES = ["operator", "manager"] as const satisfies readonly UserRole[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** RFC 5321's path limit; also what a CHECK-free text column should never
 * be asked to hold for an address. */
export const EMAIL_MAX_LENGTH = 254;
export const FULL_NAME_MAX_LENGTH = 120;

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.some((role) => role === value);
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return ASSIGNABLE_ROLES.some((role) => role === value);
}

/** Trimmed and lowercased before it is checked: allowed_users stores
 * lowercase only (allowed_users_email_lowercase_chk, 0013) and the access-token
 * hook compares lowercase, so "Ali@Company.uz" and "ali@company.uz" are one
 * person. Messages are admin.validation keys (lib/admin/validation.ts). */
export const userEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(EMAIL_MAX_LENGTH, "tooLong")
  .email("invalid");

/** What /admin/users accepts as a role: operator or manager, never admin. */
export const assignableRoleSchema = z.enum(ASSIGNABLE_ROLES);

/** Optional: an empty field is stored as null, not as "". */
export const fullNameSchema = z
  .string()
  .trim()
  .max(FULL_NAME_MAX_LENGTH, "tooLong")
  .nullish()
  .transform((value) => (value ? value : null));

export const addUserSchema = z.object({
  email: userEmailSchema,
  role: assignableRoleSchema,
  fullName: fullNameSchema,
});

export const setRoleSchema = z.object({ email: userEmailSchema, role: assignableRoleSchema });

export const setActiveSchema = z.object({ email: userEmailSchema, active: z.boolean() });

/** The email as typed into the remove dialog's confirmation field, compared
 * the way `userEmailSchema` stores it — so " Aziza@WaterTech.uz " confirms
 * "aziza@watertech.uz". */
export function normalizeConfirmEmail(typed: string): string {
  return typed.trim().toLowerCase();
}

/** Removing a person: the email, whether their activity history goes too, and
 * the email typed again as a confirmation — the one thing standing between a
 * misclick and an irreversible purge, so the Server Action re-checks it rather
 * than trusting the dialog. A mismatch is a `confirmMismatch` issue on
 * `confirmEmail`. */
export const removeUserSchema = z
  .object({
    email: userEmailSchema,
    purgeHistory: z.boolean(),
    // Capped like every input (CLAUDE.md §7), with room for stray whitespace
    // around a pasted address — it is trimmed before the comparison.
    confirmEmail: z.string().max(EMAIL_MAX_LENGTH * 2, "tooLong"),
  })
  .superRefine((input, ctx) => {
    if (normalizeConfirmEmail(input.confirmEmail) !== input.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmEmail"], message: "confirmMismatch" });
    }
  });

export type AddUserInput = z.input<typeof addUserSchema>;

/** One allow-list row as /admin/users renders it. */
export interface AdminUser {
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  /** Newest telemetry event (admin_user_last_activity, 0017); null when none. */
  lastActivityAt: string | null;
  /** allowed_users.created_at, toISOString() form — "added on". */
  addedAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AccessState {
  role: UserRole;
  isActive: boolean;
}

export function isActiveAdmin(state: AccessState): boolean {
  return state.role === "admin" && state.isActive;
}

/** True when a change creates an admin, or changes the role or active flag of
 * — or removes — a row that is one: what the guard refuses through the API
 * (WT462). `after` is null for a removal. */
function touchesAdminRow(before: AccessState, after: AccessState | null): boolean {
  if (after === null) return before.role === "admin";
  if (before.role !== "admin") return after.role === "admin";
  return after.role !== before.role || after.isActive !== before.isActive;
}

export type AccessViolation = "last_admin" | "self_change" | "admin_locked";

/**
 * The TS half of private.allowed_users_guard (0017, admin semantics since
 * 0020), in the same order: losing the last active admin first — a sole admin
 * demoting themselves is told what holds even in the SQL editor — then an
 * admin demoting, deactivating or removing their own row, then any other change
 * that promotes a row to admin or demotes, deactivates, reactivates or removes
 * one: admin rows are SQL-editor-only. Renaming, or a change that leaves the
 * role and the active flag as they were, is never a violation.
 *
 * `after` is the row as the change leaves it, or null when the change removes
 * the row (0022) — the same convention as `access_audit.after`.
 *
 * `activeAdmins` is every active admin's email, lowercased, as read just
 * before the write. The database repeats all three checks under a lock, so
 * this is the early, readable refusal — not the protection.
 */
export function accessViolation(args: {
  actor: string;
  target: string;
  before: AccessState;
  after: AccessState | null;
  activeAdmins: readonly string[];
}): AccessViolation | null {
  const staysActiveAdmin = args.after !== null && isActiveAdmin(args.after);

  if (isActiveAdmin(args.before) && !staysActiveAdmin) {
    const others = args.activeAdmins.filter((email) => email !== args.target);
    if (others.length === 0) return "last_admin";
  }

  if (args.actor === args.target && !staysActiveAdmin) return "self_change";

  if (touchesAdminRow(args.before, args.after)) return "admin_locked";

  return null;
}
