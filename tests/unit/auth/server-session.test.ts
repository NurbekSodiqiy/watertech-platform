import { beforeEach, describe, expect, it, vi } from "vitest";

// requireAdminPage is the page layer of the admin panel's defence in depth
// (CLAUDE.md §7): the admin layout and every /dashboard page call it first, so
// a non-admin is refused here even if middleware were bypassed. The Supabase
// server client and next-intl's redirect are stubbed; a redirect throws, as
// next/navigation's does, so nothing after it can run.

const mocks = vi.hoisted(() => ({
  claims: null as Record<string, unknown> | null,
  redirect: vi.fn((args: { href: string; locale: string }): never => {
    throw new Error(`NEXT_REDIRECT ${args.locale} ${args.href}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      async getClaims() {
        return { data: mocks.claims ? { claims: mocks.claims } : null };
      },
    },
  }),
}));

vi.mock("@/i18n/routing", () => ({ redirect: mocks.redirect }));

const { getServerSession, requireAdminPage } = await import("@/lib/auth/server-session");

beforeEach(() => {
  mocks.claims = null;
  mocks.redirect.mockClear();
});

describe("getServerSession", () => {
  it("returns the email and one of the three roles", async () => {
    for (const role of ["operator", "manager", "admin"] as const) {
      mocks.claims = { email: "a@b.uz", app_metadata: { role } };
      await expect(getServerSession()).resolves.toEqual({ email: "a@b.uz", role });
    }
  });

  it("returns null without a valid role or an email", async () => {
    for (const claims of [null, { email: "a@b.uz", app_metadata: { role: "none" } }, { app_metadata: { role: "admin" } }]) {
      mocks.claims = claims;
      await expect(getServerSession()).resolves.toBeNull();
    }
  });
});

describe("requireAdminPage", () => {
  it("lets the admin through and hands back the session", async () => {
    mocks.claims = { email: "owner@watertech.uz", app_metadata: { role: "admin" } };
    await expect(requireAdminPage("uz")).resolves.toEqual({ email: "owner@watertech.uz", role: "admin" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("sends an operator or a sales manager to their home, in their locale", async () => {
    for (const role of ["operator", "manager"] as const) {
      mocks.redirect.mockClear();
      mocks.claims = { email: "someone@watertech.uz", app_metadata: { role } };
      await expect(requireAdminPage("ru")).rejects.toThrow("NEXT_REDIRECT ru /");
      expect(mocks.redirect).toHaveBeenCalledWith({ href: "/", locale: "ru" });
    }
  });

  it("sends a missing or role-less session to /login", async () => {
    for (const claims of [null, { email: "stranger@gmail.com", app_metadata: { role: "none" } }]) {
      mocks.redirect.mockClear();
      mocks.claims = claims;
      await expect(requireAdminPage("uz")).rejects.toThrow("NEXT_REDIRECT uz /login");
      expect(mocks.redirect).toHaveBeenCalledWith({ href: "/login", locale: "uz" });
    }
  });
});
