import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminActionError } from "@/lib/admin/errors";
import type { ServerSession } from "@/lib/auth/server-session";

// requireAdminSession is the Server Action layer of the admin panel's defence
// in depth (CLAUDE.md §7): every admin action, the dashboard's quick actions
// and the notifications inbox call it first. A Server Action is a public
// endpoint, so it must refuse an operator's or a sales manager's session on
// its own — middleware never sees the POST.

const mocks = vi.hoisted(() => ({ session: null as ServerSession | null }));

vi.mock("@/lib/auth/server-session", () => ({
  getServerSession: async () => mocks.session,
}));

const { requireAdminSession } = await import("@/lib/admin/actions/guard");

beforeEach(() => {
  mocks.session = null;
});

describe("requireAdminSession", () => {
  it("returns the admin's email", async () => {
    mocks.session = { email: "owner@watertech.uz", role: "admin" };
    await expect(requireAdminSession()).resolves.toEqual({ email: "owner@watertech.uz" });
  });

  it("throws unauthorized for an operator, a sales manager and no session", async () => {
    for (const session of [
      { email: "op@watertech.uz", role: "operator" },
      { email: "sales@watertech.uz", role: "manager" },
      null,
    ] satisfies (ServerSession | null)[]) {
      mocks.session = session;
      const error = await requireAdminSession().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AdminActionError);
      expect(error).toMatchObject({ code: "unauthorized" });
    }
  });
});
