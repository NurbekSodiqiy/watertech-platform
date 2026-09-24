import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stubbed Supabase client: getClaims() behaves like a real token refresh — it
// calls the cookie adapter's setAll() with new session cookies before
// resolving — and makes no network call.
const stub = vi.hoisted(() => ({
  claims: null as Record<string, unknown> | null,
  refresh: true,
}));

vi.mock("@/lib/env", () => ({
  clientEnv: { NEXT_PUBLIC_SUPABASE_URL: "https://abcd.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-tests-only" },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: Record<string, unknown> }[],
          headers: Record<string, string>
        ) => void;
      };
    }
  ) => ({
    auth: {
      async getClaims() {
        if (stub.refresh) {
          opts.cookies.setAll(
            [{ name: "sb-abcd-auth-token", value: "refreshed-token", options: { path: "/", httpOnly: false, sameSite: "lax" } }],
            { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" }
          );
        }
        return { data: stub.claims ? { claims: stub.claims, header: { alg: "ES256" } } : null };
      },
    },
  }),
}));

const { middleware } = await import("@/middleware");

function request(path: string) {
  return new NextRequest(new URL(path, "https://kb.example.com"), {
    headers: { cookie: "sb-abcd-auth-token=stale-token" },
  });
}

function refreshedCookie(res: Response): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith("sb-abcd-auth-token="));
}

describe("middleware — refreshed session cookies", () => {
  beforeEach(() => {
    stub.claims = null;
    stub.refresh = true;
  });

  it("keeps them on the /login -> home redirect", async () => {
    stub.claims = { email: "op@example.com", app_metadata: { role: "operator" } };
    const res = await middleware(request("/login"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/");
    expect(refreshedCookie(res)).toContain("refreshed-token");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("keeps them on the role redirect, with the locale", async () => {
    // A sales manager is kept out of the admin panel and sent home (0020).
    stub.claims = { email: "m@example.com", app_metadata: { role: "manager" } };
    const res = await middleware(request("/ru/dashboard"));
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/ru");
    expect(refreshedCookie(res)).toContain("refreshed-token");
  });

  it("keeps them on the admin's /login -> /admin redirect", async () => {
    stub.claims = { email: "owner@example.com", app_metadata: { role: "admin" } };
    const res = await middleware(request("/login"));
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/admin");
    expect(refreshedCookie(res)).toContain("refreshed-token");
  });

  it("keeps them (e.g. the cleared session) on the redirect to /login", async () => {
    const res = await middleware(request("/faq"));
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/login");
    expect(refreshedCookie(res)).toContain("refreshed-token");
  });

  it("keeps them on a pass-through response", async () => {
    stub.claims = { email: "op@example.com", app_metadata: { role: "operator" } };
    const res = await middleware(request("/faq"));
    expect(res.headers.get("location")).toBeNull();
    expect(refreshedCookie(res)).toContain("refreshed-token");
  });

  it("sets no cookies on a redirect when nothing was refreshed", async () => {
    stub.refresh = false;
    stub.claims = { email: "op@example.com", app_metadata: { role: "operator" } };
    const res = await middleware(request("/login"));
    expect(res.status).toBe(307);
    expect(refreshedCookie(res)).toBeUndefined();
  });
});
