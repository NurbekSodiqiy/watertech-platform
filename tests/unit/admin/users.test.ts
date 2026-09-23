import { describe, expect, it } from "vitest";
import { accessViolation, addUserSchema, userEmailSchema, type AccessState } from "@/lib/admin/users";

// accessViolation is the TS copy of private.allowed_users_guard's two rules
// (0017). supabase/tests/rls-checks.sql asserts the SQL side; this pins the
// same table of cases here, in the same order of precedence.

const ACTIVE_MANAGER: AccessState = { role: "manager", isActive: true };
const INACTIVE_MANAGER: AccessState = { role: "manager", isActive: false };
const OPERATOR: AccessState = { role: "operator", isActive: true };

describe("accessViolation", () => {
  const cases: {
    label: string;
    actor: string;
    target: string;
    before: AccessState;
    after: AccessState;
    activeManagers: string[];
    expected: ReturnType<typeof accessViolation>;
  }[] = [
    { label: "demote another manager, one stays", actor: "a", target: "b", before: ACTIVE_MANAGER, after: OPERATOR, activeManagers: ["a", "b"], expected: null },
    { label: "deactivate another manager, one stays", actor: "a", target: "b", before: ACTIVE_MANAGER, after: INACTIVE_MANAGER, activeManagers: ["a", "b"], expected: null },
    { label: "demote self with another manager", actor: "a", target: "a", before: ACTIVE_MANAGER, after: OPERATOR, activeManagers: ["a", "b"], expected: "self_change" },
    { label: "deactivate self with another manager", actor: "a", target: "a", before: ACTIVE_MANAGER, after: INACTIVE_MANAGER, activeManagers: ["a", "b"], expected: "self_change" },
    { label: "demote self as the last manager", actor: "a", target: "a", before: ACTIVE_MANAGER, after: OPERATOR, activeManagers: ["a"], expected: "last_manager" },
    { label: "demote the last manager (not self)", actor: "a", target: "b", before: ACTIVE_MANAGER, after: OPERATOR, activeManagers: ["b"], expected: "last_manager" },
    { label: "self no-op", actor: "a", target: "a", before: ACTIVE_MANAGER, after: ACTIVE_MANAGER, activeManagers: ["a"], expected: null },
    { label: "promote an operator", actor: "a", target: "c", before: OPERATOR, after: ACTIVE_MANAGER, activeManagers: ["a"], expected: null },
    { label: "deactivate an operator", actor: "a", target: "c", before: OPERATOR, after: { role: "operator", isActive: false }, activeManagers: ["a"], expected: null },
    { label: "reactivate a manager", actor: "a", target: "b", before: INACTIVE_MANAGER, after: ACTIVE_MANAGER, activeManagers: ["a"], expected: null },
  ];

  it.each(cases)("$label → $expected", ({ actor, target, before, after, activeManagers, expected }) => {
    expect(accessViolation({ actor, target, before, after, activeManagers })).toBe(expected);
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

  it("accepts only the two roles", () => {
    expect(addUserSchema.safeParse({ email: "a@b.uz", role: "admin", fullName: null }).success).toBe(false);
  });
});
