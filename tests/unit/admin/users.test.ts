import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_ROLES,
  USER_ROLES,
  accessViolation,
  addUserSchema,
  isAssignableRole,
  isUserRole,
  normalizeConfirmEmail,
  removeUserSchema,
  setRoleSchema,
  userEmailSchema,
  type AccessState,
} from "@/lib/admin/users";
import { adminErrorMap } from "@/lib/admin/validation";

// accessViolation is the TS copy of private.allowed_users_guard's three rules
// (0017, admin semantics since 0020). supabase/tests/rls-checks.sql asserts
// the SQL side; this pins the same table of cases here, in the same order of
// precedence: last admin (WT460), then self (WT461), then admin rows being
// SQL-editor-only (WT462).

const ACTIVE_ADMIN: AccessState = { role: "admin", isActive: true };
const INACTIVE_ADMIN: AccessState = { role: "admin", isActive: false };
const MANAGER: AccessState = { role: "manager", isActive: true };
const INACTIVE_MANAGER: AccessState = { role: "manager", isActive: false };
const OPERATOR: AccessState = { role: "operator", isActive: true };
const INACTIVE_OPERATOR: AccessState = { role: "operator", isActive: false };

describe("accessViolation", () => {
  const cases: {
    label: string;
    actor: string;
    target: string;
    before: AccessState;
    after: AccessState;
    activeAdmins: string[];
    expected: ReturnType<typeof accessViolation>;
  }[] = [
    // Everything /admin/users is for: operators and sales managers.
    { label: "operator -> manager", actor: "a", target: "c", before: OPERATOR, after: MANAGER, activeAdmins: ["a"], expected: null },
    { label: "manager -> operator", actor: "a", target: "c", before: MANAGER, after: OPERATOR, activeAdmins: ["a"], expected: null },
    { label: "deactivate an operator", actor: "a", target: "c", before: OPERATOR, after: INACTIVE_OPERATOR, activeAdmins: ["a"], expected: null },
    { label: "reactivate a manager", actor: "a", target: "c", before: INACTIVE_MANAGER, after: MANAGER, activeAdmins: ["a"], expected: null },

    // Last admin first: true in the SQL editor too, so it is the useful answer.
    { label: "demote self as the last admin", actor: "a", target: "a", before: ACTIVE_ADMIN, after: OPERATOR, activeAdmins: ["a"], expected: "last_admin" },
    { label: "deactivate self as the last admin", actor: "a", target: "a", before: ACTIVE_ADMIN, after: INACTIVE_ADMIN, activeAdmins: ["a"], expected: "last_admin" },
    { label: "demote the last admin (not self)", actor: "a", target: "b", before: ACTIVE_ADMIN, after: MANAGER, activeAdmins: ["b"], expected: "last_admin" },

    // Then self: an admin's own row, another admin still active.
    { label: "demote self with another admin", actor: "a", target: "a", before: ACTIVE_ADMIN, after: MANAGER, activeAdmins: ["a", "b"], expected: "self_change" },
    { label: "deactivate self with another admin", actor: "a", target: "a", before: ACTIVE_ADMIN, after: INACTIVE_ADMIN, activeAdmins: ["a", "b"], expected: "self_change" },

    // Then admin rows are SQL-editor-only, whoever and whatever else.
    { label: "demote another admin, one stays", actor: "a", target: "b", before: ACTIVE_ADMIN, after: OPERATOR, activeAdmins: ["a", "b"], expected: "admin_locked" },
    { label: "deactivate another admin, one stays", actor: "a", target: "b", before: ACTIVE_ADMIN, after: INACTIVE_ADMIN, activeAdmins: ["a", "b"], expected: "admin_locked" },
    { label: "reactivate an inactive admin", actor: "a", target: "b", before: INACTIVE_ADMIN, after: ACTIVE_ADMIN, activeAdmins: ["a"], expected: "admin_locked" },
    { label: "demote an inactive admin", actor: "a", target: "b", before: INACTIVE_ADMIN, after: INACTIVE_OPERATOR, activeAdmins: ["a"], expected: "admin_locked" },
    { label: "promote an operator to admin", actor: "a", target: "c", before: OPERATOR, after: ACTIVE_ADMIN, activeAdmins: ["a"], expected: "admin_locked" },
    { label: "promote a manager to admin", actor: "a", target: "c", before: MANAGER, after: ACTIVE_ADMIN, activeAdmins: ["a"], expected: "admin_locked" },
    { label: "promote an inactive manager to an inactive admin", actor: "a", target: "c", before: INACTIVE_MANAGER, after: INACTIVE_ADMIN, activeAdmins: ["a"], expected: "admin_locked" },

    // No-ops are never a violation — they are how an auth_sync_failed is retried.
    { label: "self no-op", actor: "a", target: "a", before: ACTIVE_ADMIN, after: ACTIVE_ADMIN, activeAdmins: ["a"], expected: null },
    { label: "no-op on another admin", actor: "a", target: "b", before: ACTIVE_ADMIN, after: ACTIVE_ADMIN, activeAdmins: ["a", "b"], expected: null },
    { label: "no-op on an inactive admin", actor: "a", target: "b", before: INACTIVE_ADMIN, after: INACTIVE_ADMIN, activeAdmins: ["a"], expected: null },
  ];

  it.each(cases)("$label → $expected", ({ actor, target, before, after, activeAdmins, expected }) => {
    expect(accessViolation({ actor, target, before, after, activeAdmins })).toBe(expected);
  });
});

// A removal (0022) is `after: null`, like access_audit's `after` for a delete.
// The guard meets a DELETE with the same three checks in the same order, and a
// removal is never a no-op: every admin row is refused, active or not.
describe("accessViolation — removing a row", () => {
  const cases: {
    label: string;
    actor: string;
    target: string;
    before: AccessState;
    activeAdmins: string[];
    expected: ReturnType<typeof accessViolation>;
  }[] = [
    { label: "remove an operator", actor: "a", target: "c", before: OPERATOR, activeAdmins: ["a"], expected: null },
    { label: "remove a sales manager", actor: "a", target: "c", before: MANAGER, activeAdmins: ["a"], expected: null },
    { label: "remove an inactive operator", actor: "a", target: "c", before: INACTIVE_OPERATOR, activeAdmins: ["a"], expected: null },
    { label: "remove an inactive manager", actor: "a", target: "c", before: INACTIVE_MANAGER, activeAdmins: ["a"], expected: null },

    { label: "remove self as the last admin", actor: "a", target: "a", before: ACTIVE_ADMIN, activeAdmins: ["a"], expected: "last_admin" },
    { label: "remove the last admin (not self)", actor: "a", target: "b", before: ACTIVE_ADMIN, activeAdmins: ["b"], expected: "last_admin" },
    { label: "remove self with another admin", actor: "a", target: "a", before: ACTIVE_ADMIN, activeAdmins: ["a", "b"], expected: "self_change" },
    { label: "remove another active admin", actor: "a", target: "b", before: ACTIVE_ADMIN, activeAdmins: ["a", "b"], expected: "admin_locked" },
    { label: "remove an inactive admin", actor: "a", target: "b", before: INACTIVE_ADMIN, activeAdmins: ["a"], expected: "admin_locked" },
    // Self with a non-admin row (a stale admin token): still "self" — the
    // guard says WT461 for any caller's own row.
    { label: "remove one's own operator row", actor: "a", target: "a", before: OPERATOR, activeAdmins: ["a"], expected: "self_change" },
  ];

  it.each(cases)("$label → $expected", ({ actor, target, before, activeAdmins, expected }) => {
    expect(accessViolation({ actor, target, before, after: null, activeAdmins })).toBe(expected);
  });
});

describe("removeUserSchema", () => {
  it("accepts the email typed again, whatever its case or surrounding spaces", () => {
    const parsed = removeUserSchema.parse(
      { email: " Aziza@WaterTech.uz ", purgeHistory: true, confirmEmail: "  AZIZA@watertech.UZ " },
      { errorMap: adminErrorMap }
    );
    expect(parsed).toMatchObject({ email: "aziza@watertech.uz", purgeHistory: true });
    expect(normalizeConfirmEmail("  AZIZA@watertech.UZ ")).toBe("aziza@watertech.uz");
  });

  it("refuses anything else as confirmMismatch on confirmEmail", () => {
    for (const confirmEmail of ["", "aziza", "aziza@watertech.u", "aziza@watertech.uz.", "a ziza@watertech.uz"]) {
      const result = removeUserSchema.safeParse(
        { email: "aziza@watertech.uz", purgeHistory: false, confirmEmail },
        { errorMap: adminErrorMap }
      );
      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ["confirmEmail"], message: "confirmMismatch" }),
      ]);
    }
  });

  it("requires a real boolean for purgeHistory and caps the confirmation's length", () => {
    const flag = removeUserSchema.safeParse({ email: "a@b.uz", purgeHistory: "true", confirmEmail: "a@b.uz" });
    expect(flag.error?.issues[0]?.path).toEqual(["purgeHistory"]);

    const long = removeUserSchema.safeParse(
      { email: "a@b.uz", purgeHistory: false, confirmEmail: `${" ".repeat(600)}a@b.uz` },
      { errorMap: adminErrorMap }
    );
    expect(long.success).toBe(false);
    expect(long.error?.issues[0]).toMatchObject({ path: ["confirmEmail"], message: "tooLong" });
  });
});

describe("roles", () => {
  it("knows the three allow-list roles and assigns only two of them", () => {
    expect(USER_ROLES).toEqual(["operator", "manager", "admin"]);
    expect(ASSIGNABLE_ROLES).toEqual(["operator", "manager"]);
    for (const role of USER_ROLES) expect(isUserRole(role)).toBe(true);
    expect(isAssignableRole("admin")).toBe(false);
    for (const value of ["none", "Admin", "", null, undefined, 1]) {
      expect(isUserRole(value)).toBe(false);
      expect(isAssignableRole(value)).toBe(false);
    }
  });
});

describe("user schemas", () => {
  it("trims and lowercases the email before checking it", () => {
    expect(userEmailSchema.parse("  Aziza.K@WaterTech.UZ ")).toBe("aziza.k@watertech.uz");
  });

  it("rejects what is not an email, with admin.validation keys", () => {
    const result = userEmailSchema.safeParse("aziza at watertech");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("invalid");
    expect(userEmailSchema.safeParse("   ").error?.issues[0]?.message).toBe("required");
  });

  it("turns an empty or missing full name into null", () => {
    for (const fullName of ["", "   ", null, undefined]) {
      expect(addUserSchema.parse({ email: "a@b.uz", role: "operator", fullName }).fullName).toBeNull();
    }
    expect(addUserSchema.parse({ email: "a@b.uz", role: "operator", fullName: " Aziza " }).fullName).toBe("Aziza");
  });

  it("assigns operator and manager, never admin — admin rows are SQL-editor-only", () => {
    for (const role of ["operator", "manager"]) {
      expect(addUserSchema.safeParse({ email: "a@b.uz", role, fullName: null }).success).toBe(true);
      expect(setRoleSchema.safeParse({ email: "a@b.uz", role }).success).toBe(true);
    }
    for (const role of ["admin", "none", ""]) {
      expect(addUserSchema.safeParse({ email: "a@b.uz", role, fullName: null }).success).toBe(false);
      expect(setRoleSchema.safeParse({ email: "a@b.uz", role }).success).toBe(false);
    }
  });
});
