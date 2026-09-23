import { z } from "zod";

// The allow-list (public.allowed_users) as /admin/users edits it: the input
// schemas the add-user dialog and the Server Actions both parse, the row shape
// the page renders, and the one rule both TS and SQL enforce before a write.
// No server imports — the dialog validates with the same schemas the action
// re-validates with.

export const USER_ROLES = ["operator", "manager"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** RFC 5321's path limit; also what a CHECK-free text column should never
 * be asked to hold for an address. */
export const EMAIL_MAX_LENGTH = 254;
export const FULL_NAME_MAX_LENGTH = 120;

export function isUserRole(value: unknown): value is UserRole {
  return value === "operator" || value === "manager";
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

export const userRoleSchema = z.enum(USER_ROLES);

/** Optional: an empty field is stored as null, not as "". */
export const fullNameSchema = z
  .string()
  .trim()
  .max(FULL_NAME_MAX_LENGTH, "tooLong")
  .nullish()
  .transform((value) => (value ? value : null));

export const addUserSchema = z.object({
  email: userEmailSchema,
  role: userRoleSchema,
  fullName: fullNameSchema,
});

export const setRoleSchema = z.object({ email: userEmailSchema, role: userRoleSchema });

export const setActiveSchema = z.object({ email: userEmailSchema, active: z.boolean() });

export type AddUserInput = z.input<typeof addUserSchema>;

/** One allow-list row as /admin/users renders it. */
export interface AdminUser {
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  /** Newest telemetry event (admin_user_last_activity, 0017); null when none. */
  lastActivityAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AccessState {
  role: UserRole;
  isActive: boolean;
}

export function isActiveManager(state: AccessState): boolean {
  return state.role === "manager" && state.isActive;
}

export type AccessViolation = "last_manager" | "self_change";

/**
 * The TS half of private.allowed_users_guard (0017), in the same order:
 * losing the last active manager first — a sole manager demoting themselves
 * is told the thing they can act on ("add another manager") — then a manager
 * demoting or deactivating their own row. Renaming, or a change that keeps
 * the row an active manager, is never a violation.
 *
 * `activeManagers` is every active manager's email, lowercased, as read just
 * before the write. The database repeats both checks under a lock, so this
 * is the early, readable refusal — not the protection.
 */
export function accessViolation(args: {
  actor: string;
  target: string;
  before: AccessState;
  after: AccessState;
  activeManagers: readonly string[];
}): AccessViolation | null {
  const staysActiveManager = isActiveManager(args.after);

  if (isActiveManager(args.before) && !staysActiveManager) {
    const others = args.activeManagers.filter((email) => email !== args.target);
    if (others.length === 0) return "last_manager";
  }

  if (args.actor === args.target && !staysActiveManager) return "self_change";

  return null;
}
