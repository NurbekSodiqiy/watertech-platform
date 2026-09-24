import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Role model v2 (CLAUDE.md §7): the middleware layer of the role × route
// matrix. The admin panel (/admin, /dashboard) is the admin's alone; operators
// and sales managers are sent home ("/"); the admin may also open every
// operator route (preview). Driven through the real middleware with a stubbed
// Supabase client whose getClaims() returns fixed claims and makes no network
// call — the same stub as middleware-cookies.test.ts, minus the refresh.

const stub = vi.hoisted(() => ({
  claims: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/env", () => ({
  clientEnv: { NEXT_PUBLIC_SUPABASE_URL: "https://abcd.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-tests-only" },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      async getClaims() {
        return { data: stub.claims ? { claims: stub.claims, header: { alg: "ES256" } } : null };
      },
    },
  }),
}));

const { middleware } = await import("@/middleware");

type Identity = "admin" | "manager" | "operator" | "no session" | "role none";

const CLAIMS: Record<Identity, Record<string, unknown> | null> = {
  admin: { email: "owner@example.com", app_metadata: { role: "admin" } },
  manager: { email: "sales@example.com", app_metadata: { role: "manager" } },
  operator: { email: "op@example.com", app_metadata: { role: "operator" } },
  "no session": null,
  // A token minted before 0014 (or with the hook disabled): signed in, no role.
  "role none": { email: "stranger@example.com", app_metadata: { role: "none" } },
};

/** Where the request ends up: "pass" when middleware lets it through,
 * otherwise the redirect's path and query. */
async function outcome(identity: Identity, path: string): Promise<string> {
  stub.claims = CLAIMS[identity];
  const res = await middleware(new NextRequest(new URL(path, "https://kb.example.com")));
  const location = res.headers.get("location");
  if (!location) return "pass";
  const url = new URL(location);
  return `${url.pathname}${url.search}`;
}

beforeEach(() => {
  stub.claims = null;
});

// The matrix from the task report: role × route, expected middleware result.
const MATRIX: { path: string; expected: Record<Identity, string> }[] = [
  {
    path: "/",
    expected: { admin: "pass", manager: "pass", operator: "pass", "no session": "/login", "role none": "/login?error=not_allowed" },
  },
  {
    path: "/products",
    expected: { admin: "pass", manager: "pass", operator: "pass", "no session": "/login", "role none": "/login?error=not_allowed" },
  },
  {
    path: "/admin",
    expected: { admin: "pass", manager: "/", operator: "/", "no session": "/login", "role none": "/login?error=not_allowed" },
  },
  {
    path: "/admin/users",
    expected: { admin: "pass", manager: "/", operator: "/", "no session": "/login", "role none": "/login?error=not_allowed" },
  },
  {
    path: "/dashboard",
    expected: { admin: "pass", manager: "/", operator: "/", "no session": "/login", "role none": "/login?error=not_allowed" },
  },
  {
    path: "/dashboard/quality",
    expected: { admin: "pass", manager: "/", operator: "/", "no session": "/login", "role none": "/login?error=not_allowed" },
  },
  {
    path: "/login",
    expected: { admin: "/admin", manager: "/", operator: "/", "no session": "pass", "role none": "pass" },
  },
];

describe("middleware — role × route (uz, the unprefixed default locale)", () => {
  for (const { path, expected } of MATRIX) {
    for (const [identity, result] of Object.entries(expected) as [Identity, string][]) {
      it(`${identity} on ${path} → ${result}`, async () => {
        expect(await outcome(identity, path)).toBe(result);
      });
    }
  }
});

describe("middleware — role × route keeps the ru locale", () => {
  it("sends a sales manager or an operator from the admin panel to the ru home", async () => {
    for (const identity of ["manager", "operator"] as const) {
      expect(await outcome(identity, "/ru/admin/users")).toBe("/ru");
      expect(await outcome(identity, "/ru/dashboard")).toBe("/ru");
    }
  });

  it("lets the admin into both areas, and sends a signed-in admin from /ru/login to /ru/admin", async () => {
    expect(await outcome("admin", "/ru/admin/users")).toBe("pass");
    expect(await outcome("admin", "/ru/products")).toBe("pass");
    expect(await outcome("admin", "/ru/login")).toBe("/ru/admin");
  });
});

describe("middleware — the admin gate is not a prefix match", () => {
  it("does not treat look-alike operator paths as the admin panel", async () => {
    // Real routes would 404, but middleware must not bounce a manager off them.
    for (const path of ["/administrator", "/dashboards", "/company/admin"]) {
      expect(await outcome("manager", path)).toBe("pass");
    }
  });
});
