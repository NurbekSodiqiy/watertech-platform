import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { deleteAuthAccounts, type AccountDeleteAdmin } from "@/lib/auth/delete-account";

// The Supabase Auth half of removing a person. Like ban.test.ts: the admin API
// has no lookup by email, so these pin which accounts the paging walk finds,
// that every one of them is deleted (hard delete — no soft-delete flag), that a
// retry after a concurrent delete counts as done, and that neither the email
// nor an auth user id ever reaches a log line.

const EMAIL = "aziza@watertech.uz";

function authUser(id: string, email: string | undefined): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  };
}

interface FakeAdminOptions {
  pages: User[][];
  listError?: boolean;
  /** uid → the error deleteUser answers for it. */
  deleteErrors?: Record<string, AuthApiError>;
}

function fakeAdmin(options: FakeAdminOptions) {
  const listUsers = vi.fn<AccountDeleteAdmin["listUsers"]>(async (params) => {
    if (options.listError) {
      return { data: { users: [] }, error: new AuthApiError("boom", 500, "unexpected_failure") };
    }
    const page = params?.page ?? 1;
    const users = options.pages[page - 1] ?? [];
    const nextPage = page < options.pages.length ? page + 1 : null;
    return { data: { users, aud: "authenticated", nextPage, lastPage: options.pages.length, total: 0 }, error: null };
  });
  const deleteUser = vi.fn<AccountDeleteAdmin["deleteUser"]>(async (uid) => {
    const error = options.deleteErrors?.[uid];
    if (error) return { data: { user: null }, error };
    return { data: { user: authUser(uid, EMAIL) }, error: null };
  });
  const admin: AccountDeleteAdmin = { listUsers, deleteUser };
  return { admin, listUsers, deleteUser };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteAuthAccounts", () => {
  it("deletes every account with the email, matched case-insensitively, and nobody else", async () => {
    const { admin, deleteUser } = fakeAdmin({
      pages: [[authUser("u-1", "Aziza@WaterTech.uz"), authUser("u-2", "someone@else.uz"), authUser("u-3", EMAIL)]],
    });

    await expect(deleteAuthAccounts(admin, `  ${EMAIL.toUpperCase()} `)).resolves.toBe("applied");

    // A hard delete: deleteUser(uid) with no soft-delete flag.
    expect(deleteUser.mock.calls).toEqual([["u-1"], ["u-3"]]);
  });

  it("reports no_account, deleting nothing, when nobody ever signed in with the email", async () => {
    const { admin, deleteUser } = fakeAdmin({ pages: [[authUser("u-1", "other@watertech.uz")]] });

    await expect(deleteAuthAccounts(admin, EMAIL)).resolves.toBe("no_account");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("walks every page until GoTrue reports the last one", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => authUser(`p1-${i}`, `user${i}@watertech.uz`));
    const { admin, listUsers, deleteUser } = fakeAdmin({ pages: [full, [authUser("p2-target", EMAIL)]] });

    await expect(deleteAuthAccounts(admin, EMAIL)).resolves.toBe("applied");
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(deleteUser.mock.calls).toEqual([["p2-target"]]);
  });

  it("fails when the listing fails, without deleting anyone", async () => {
    const { admin, deleteUser } = fakeAdmin({ pages: [], listError: true });

    await expect(deleteAuthAccounts(admin, EMAIL)).resolves.toBe("failed");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("fails when any one delete fails, after still trying the rest", async () => {
    const { admin, deleteUser } = fakeAdmin({
      pages: [[authUser("u-1", EMAIL), authUser("u-2", EMAIL)]],
      deleteErrors: { "u-1": new AuthApiError("nope", 500, "unexpected_failure") },
    });

    await expect(deleteAuthAccounts(admin, EMAIL)).resolves.toBe("failed");
    expect(deleteUser).toHaveBeenCalledTimes(2);
  });

  it("counts an account deleted meanwhile (404 / user_not_found) as done", async () => {
    const { admin } = fakeAdmin({
      pages: [[authUser("u-1", EMAIL), authUser("u-2", EMAIL)]],
      deleteErrors: {
        "u-1": new AuthApiError("User not found", 404, "user_not_found"),
        "u-2": new AuthApiError("User not found", 404, undefined),
      },
    });

    await expect(deleteAuthAccounts(admin, EMAIL)).resolves.toBe("applied");
  });

  it("never logs the email or an auth user id", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = fakeAdmin({
      pages: [[authUser("secret-uid-1", EMAIL)]],
      deleteErrors: { "secret-uid-1": new AuthApiError("nope for secret-uid-1", 500, "unexpected_failure") },
    });
    await deleteAuthAccounts(admin, EMAIL);
    await deleteAuthAccounts(fakeAdmin({ pages: [], listError: true }).admin, EMAIL);

    expect(logged).toHaveBeenCalled();
    const text = JSON.stringify(logged.mock.calls);
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain("secret-uid-1");
  });
});
