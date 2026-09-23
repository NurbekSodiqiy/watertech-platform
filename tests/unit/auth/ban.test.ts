import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { SIGN_IN_BAN_DURATION, setSignInBlocked, type SignInBlockAdmin } from "@/lib/auth/ban";

// The Supabase Auth half of deactivation. The admin API has no lookup by
// email, so these pin the paging walk (which accounts are found), which
// accounts are touched, the exact ban_duration values the docs define, and
// that neither the email nor an auth user id ever reaches a log line.

const EMAIL = "aziza@watertech.uz";
const FAR_FUTURE = "2126-01-01T00:00:00Z";

function authUser(id: string, email: string | undefined, bannedUntil?: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    banned_until: bannedUntil,
  };
}

interface FakeAdminOptions {
  pages: User[][];
  /** Pagination.nextPage per page; defaults to "a next page exists iff one is queued". */
  nextPage?: (page: number) => number | null;
  listError?: boolean;
  updateErrorFor?: string;
}

function fakeAdmin(options: FakeAdminOptions) {
  const listUsers = vi.fn<SignInBlockAdmin["listUsers"]>(async (params) => {
    if (options.listError) {
      return { data: { users: [] }, error: new AuthApiError("boom", 500, "unexpected_failure") };
    }
    const page = params?.page ?? 1;
    const users = options.pages[page - 1] ?? [];
    const nextPage = options.nextPage ? options.nextPage(page) : page < options.pages.length ? page + 1 : null;
    return { data: { users, aud: "authenticated", nextPage, lastPage: options.pages.length, total: 0 }, error: null };
  });
  const updateUserById = vi.fn<SignInBlockAdmin["updateUserById"]>(async (uid) => {
    if (uid === options.updateErrorFor) {
      return { data: { user: null }, error: new AuthApiError("nope", 500, "unexpected_failure") };
    }
    return { data: { user: authUser(uid, EMAIL) }, error: null };
  });
  const admin: SignInBlockAdmin = { listUsers, updateUserById };
  return { admin, listUsers, updateUserById };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("setSignInBlocked", () => {
  it("bans every account with the email, matched case-insensitively, for the documented 100 years", async () => {
    const { admin, updateUserById } = fakeAdmin({
      pages: [[authUser("u-1", "Aziza@WaterTech.uz"), authUser("u-2", "someone@else.uz"), authUser("u-3", EMAIL)]],
    });

    await expect(setSignInBlocked(admin, `  ${EMAIL.toUpperCase()} `, true)).resolves.toBe("applied");

    expect(updateUserById.mock.calls).toEqual([
      ["u-1", { ban_duration: SIGN_IN_BAN_DURATION }],
      ["u-3", { ban_duration: SIGN_IN_BAN_DURATION }],
    ]);
    expect(SIGN_IN_BAN_DURATION).toBe("876000h");
  });

  it("re-applies a ban that is already there (a retry, or a shorter manual ban)", async () => {
    const { admin, updateUserById } = fakeAdmin({ pages: [[authUser("u-1", EMAIL, FAR_FUTURE)]] });

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("applied");
    expect(updateUserById).toHaveBeenCalledWith("u-1", { ban_duration: SIGN_IN_BAN_DURATION });
  });

  it("lifts a ban with 'none' and leaves unbanned accounts alone", async () => {
    const { admin, updateUserById } = fakeAdmin({
      pages: [[authUser("u-1", EMAIL, FAR_FUTURE), authUser("u-2", EMAIL)]],
    });

    await expect(setSignInBlocked(admin, EMAIL, false)).resolves.toBe("applied");
    expect(updateUserById.mock.calls).toEqual([["u-1", { ban_duration: "none" }]]);
  });

  it("reports no_account, and touches nothing, when nobody has signed in with the email", async () => {
    const { admin, updateUserById } = fakeAdmin({ pages: [[authUser("u-1", "other@watertech.uz")]] });

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("no_account");
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("walks every page until GoTrue reports the last one", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => authUser(`p1-${i}`, `user${i}@watertech.uz`));
    const { admin, listUsers, updateUserById } = fakeAdmin({
      pages: [full, [authUser("p2-target", EMAIL)]],
    });

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("applied");
    expect(listUsers.mock.calls.map(([params]) => params)).toEqual([
      { page: 1, perPage: 1000 },
      { page: 2, perPage: 1000 },
    ]);
    expect(updateUserById).toHaveBeenCalledWith("p2-target", { ban_duration: SIGN_IN_BAN_DURATION });
  });

  it("keeps paging past a short page while GoTrue still reports a next one (a server-side per_page cap)", async () => {
    const { admin, listUsers } = fakeAdmin({
      pages: [[authUser("a", "a@watertech.uz")], [authUser("b", EMAIL)]],
    });

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("applied");
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("fails when the listing fails, without banning anyone", async () => {
    const { admin, updateUserById } = fakeAdmin({ pages: [], listError: true });

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("failed");
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("fails when any one ban fails, after still trying the rest", async () => {
    const { admin, updateUserById } = fakeAdmin({
      pages: [[authUser("u-1", EMAIL), authUser("u-2", EMAIL)]],
      updateErrorFor: "u-1",
    });

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("failed");
    expect(updateUserById).toHaveBeenCalledTimes(2);
  });

  it("gives up (failed) instead of paging forever", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => authUser(`x-${i}`, `user${i}@watertech.uz`));
    const { admin, listUsers } = fakeAdmin({ pages: [], nextPage: (page) => page + 1 });
    listUsers.mockImplementation(async (params) => ({
      data: { users: full, aud: "authenticated", nextPage: (params?.page ?? 1) + 1, lastPage: 0, total: 0 },
      error: null,
    }));

    await expect(setSignInBlocked(admin, EMAIL, true)).resolves.toBe("failed");
    expect(listUsers.mock.calls.length).toBeLessThanOrEqual(50);
  });

  it("never logs the email or an auth user id", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = fakeAdmin({
      pages: [[authUser("secret-uid-1", EMAIL)]],
      updateErrorFor: "secret-uid-1",
    });
    await setSignInBlocked(admin, EMAIL, true);
    await setSignInBlocked(fakeAdmin({ pages: [], listError: true }).admin, EMAIL, true);

    expect(logged).toHaveBeenCalled();
    const text = JSON.stringify(logged.mock.calls);
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain("secret-uid-1");
  });
});
