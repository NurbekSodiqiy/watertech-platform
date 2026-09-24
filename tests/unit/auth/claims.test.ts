import { describe, expect, it } from "vitest";
import {
  ADMIN_AREAS,
  TRACKED_ROLES,
  emailFromClaims,
  homeForRole,
  isAdminArea,
  isAdminRole,
  roleFromClaims,
  type Role,
} from "@/lib/auth/claims";

// Role model v2 (CLAUDE.md §7, migration 0020): admin = the owner (admin panel
// plus an operator-app preview), manager = a sales manager, operator. These
// are the pure helpers middleware, the page gates, the Server Action guard and
// the client all read the role through.

describe("roleFromClaims", () => {
  it("accepts exactly the three allow-list roles", () => {
    for (const role of ["operator", "manager", "admin"] as const) {
      expect(roleFromClaims({ app_metadata: { role } })).toBe(role);
    }
  });

  it("refuses anything else — fail closed", () => {
    for (const claims of [
      null,
      undefined,
      "admin",
      {},
      { app_metadata: null },
      { app_metadata: "admin" },
      { app_metadata: {} },
      // What 0001's hook stamped for an unknown email (pre-0014 tokens).
      { app_metadata: { role: "none" } },
      { app_metadata: { role: "Admin" } },
      { app_metadata: { role: "ADMIN" } },
      { app_metadata: { role: " admin" } },
      { app_metadata: { role: "owner" } },
      { app_metadata: { role: ["admin"] } },
      { app_metadata: { role: null } },
      // The claim lives under app_metadata only — user_metadata is user-editable.
      { user_metadata: { role: "admin" } },
      { role: "admin" },
    ]) {
      expect(roleFromClaims(claims)).toBeNull();
    }
  });
});

describe("emailFromClaims", () => {
  it("reads a string email and nothing else", () => {
    expect(emailFromClaims({ email: "a@b.uz" })).toBe("a@b.uz");
    expect(emailFromClaims({ email: 1 })).toBeNull();
    expect(emailFromClaims(null)).toBeNull();
  });
});

describe("isAdminRole", () => {
  it("is true for admin only", () => {
    expect(isAdminRole("admin")).toBe(true);
    for (const role of ["operator", "manager", null, undefined] as const) {
      expect(isAdminRole(role)).toBe(false);
    }
  });
});

describe("isAdminArea", () => {
  it("covers /admin and /dashboard and everything under them", () => {
    expect(ADMIN_AREAS).toEqual(["/admin", "/dashboard"]);
    for (const path of [
      "/admin",
      "/admin/",
      "/admin/users",
      "/admin/scripts/new",
      "/admin/faq/x.png",
      "/dashboard",
      "/dashboard/content",
      "/dashboard/quality",
      "/dashboard/copilot",
    ]) {
      expect(isAdminArea(path)).toBe(true);
    }
  });

  it("does not match the operator app, or mere prefixes", () => {
    for (const path of [
      "/",
      "/products",
      "/faq",
      "/sales-process/scripts",
      "/login",
      "/administrator",
      "/admins",
      "/dashboards",
      "/dashboard-old",
      "/company/admin",
      "/ru/admin", // locale-prefixed: middleware strips the locale before asking
    ]) {
      expect(isAdminArea(path)).toBe(false);
    }
  });
});

describe("homeForRole", () => {
  it("sends the admin to the panel and everyone else to the operator app", () => {
    const homes: Record<Role, string> = { admin: "/admin", manager: "/", operator: "/" };
    for (const [role, home] of Object.entries(homes) as [Role, string][]) {
      expect(homeForRole(role)).toBe(home);
    }
  });

  it("never sends a non-admin into the admin panel", () => {
    for (const role of ["operator", "manager"] as const) {
      expect(isAdminArea(homeForRole(role))).toBe(false);
    }
    expect(isAdminArea(homeForRole("admin"))).toBe(true);
  });
});

describe("TRACKED_ROLES", () => {
  it("is operators and sales managers — never the admin (CLAUDE.md §9)", () => {
    expect([...TRACKED_ROLES].sort()).toEqual(["manager", "operator"]);
  });
});
