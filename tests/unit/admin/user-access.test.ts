import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { userAccessActions, type UserAccessDeps } from "@/lib/admin/actions/user-access";
import { AdminActionError } from "@/lib/admin/errors";
import type { SignInBlockResult } from "@/lib/auth/ban";
import type { AccountDeleteResult } from "@/lib/auth/delete-account";
import type { Database } from "@/lib/supabase/database.types";

// The guards on /admin/users' four actions. Same approach as
// factory.test.ts: the query builder is the real supabase-js one and only the
// network is mocked, so what is asserted is the PostgREST traffic itself —
// above all, that a refused change sends no write at all, that a
// deactivation writes the allow-list row BEFORE it bans, and that a removal
// deletes the Auth account, then purges, then deletes the row — in that order.

interface RecordedRequest {
  method: string;
  url: URL;
  body: unknown;
}

interface MockResponse {
  status: number;
  body: unknown;
}

interface Row {
  email: string;
  role: string;
  is_active: boolean;
}

const ME = "owner@watertech.uz";
const OTHER_ADMIN = "boss@watertech.uz";
const INACTIVE_ADMIN = "former@watertech.uz";
const MANAGER = "sales@watertech.uz";
const OPERATOR = "aziza@watertech.uz";

const BASE_ROWS: Row[] = [
  { email: ME, role: "admin", is_active: true },
  { email: OTHER_ADMIN, role: "admin", is_active: true },
  { email: INACTIVE_ADMIN, role: "admin", is_active: false },
  { email: MANAGER, role: "manager", is_active: true },
  { email: OPERATOR, role: "operator", is_active: true },
];

/** A PostgREST error body — supabase-js reads `code` off it. */
function pgError(code: string, message = "refused"): MockResponse {
  return { status: 400, body: { code, message, details: null, hint: null } };
}

interface Setup {
  rows?: Row[];
  /** What a PATCH / POST / DELETE on a table answers; defaults to success. */
  write?: (request: RecordedRequest) => MockResponse;
  /** What an RPC (the history purge) answers; defaults to success. */
  rpc?: (request: RecordedRequest) => MockResponse;
  session?: string | "none";
  signIn?: SignInBlockResult | "throw";
  /** The Supabase Auth delete: a fixed answer, or one per call (1-based). */
  accountDelete?: AccountDeleteResult | "throw" | ((call: number) => AccountDeleteResult);
}

const PURGED = { telemetry: 12, user_state: 2, copilot: 1 };

function setup(options: Setup = {}) {
  const rows = options.rows ?? BASE_ROWS;
  const requests: RecordedRequest[] = [];
  const events: string[] = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const rawBody = typeof init?.body === "string" ? init.body : null;
    const request: RecordedRequest = {
      method: init?.method ?? "GET",
      url,
      body: rawBody === null ? null : JSON.parse(rawBody),
    };
    requests.push(request);

    let response: MockResponse;
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      events.push(`db:rpc:${url.pathname.slice("/rest/v1/rpc/".length)}`);
      response = options.rpc ? options.rpc(request) : { status: 200, body: PURGED };
    } else if (request.method === "GET") {
      // The two reads the actions make: one row by email, or every active
      // admin (role=eq.admin&is_active=eq.true).
      const email = url.searchParams.get("email")?.replace(/^eq\./, "");
      const onlyActiveAdmins = url.searchParams.get("role") === "eq.admin";
      const matching = rows.filter((row) =>
        email !== undefined ? row.email === email : onlyActiveAdmins ? row.role === "admin" && row.is_active : true
      );
      response = { status: 200, body: matching };
    } else {
      events.push(`db:${request.method}`);
      const email = url.searchParams.get("email")?.replace(/^eq\./, "");
      response = options.write
        ? options.write(request)
        : { status: request.method === "POST" ? 201 : 200, body: request.method === "POST" ? null : [{ email }] };
    }
    return new Response(response.body === null ? null : JSON.stringify(response.body), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  const supabase = createClient<Database>("https://example.supabase.co", "anon-key-anon-key-anon-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const setSignInBlocked = vi.fn(async (email: string, blocked: boolean): Promise<SignInBlockResult> => {
    events.push(`auth:${blocked ? "ban" : "unban"}:${email}`);
    if (options.signIn === "throw") throw new Error("Missing or invalid environment variables: SUPABASE_SERVICE_ROLE_KEY");
    return options.signIn ?? "applied";
  });

  let deleteCalls = 0;
  const deleteAuthAccounts = vi.fn(async (email: string): Promise<AccountDeleteResult> => {
    deleteCalls += 1;
    events.push(`auth:delete:${email}`);
    const answer = options.accountDelete;
    if (answer === "throw") throw new Error("Missing or invalid environment variables: SUPABASE_SERVICE_ROLE_KEY");
    if (typeof answer === "function") return answer(deleteCalls);
    return answer ?? "applied";
  });

  const deps: UserAccessDeps = {
    requireSession: async () => {
      if (options.session === "none") throw new AdminActionError("unauthorized");
      return { email: options.session ?? ME };
    },
    client: () => supabase,
    setSignInBlocked,
    deleteAuthAccounts,
  };

  const writes = () => requests.filter((request) => request.method !== "GET");
  return { actions: userAccessActions(deps), requests, writes, events, setSignInBlocked, deleteAuthAccounts };
}

describe("every action", () => {
  it("refuses a caller who is not a signed-in admin before any request", async () => {
    const { actions, requests, setSignInBlocked, deleteAuthAccounts } = setup({ session: "none" });

    await expect(actions.addUser(OPERATOR, "operator", null)).resolves.toEqual({ ok: false, code: "unauthorized" });
    await expect(actions.setRole(OPERATOR, "manager")).resolves.toEqual({ ok: false, code: "unauthorized" });
    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: false, code: "unauthorized" });
    await expect(actions.removeUser(OPERATOR, true, OPERATOR)).resolves.toEqual({ ok: false, code: "unauthorized" });

    expect(requests).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("refuses an admin token whose allow-list row is no longer an active admin (stale JWT)", async () => {
    const demoted: Row[] = BASE_ROWS.map((row) => (row.email === ME ? { ...row, role: "manager" } : row));
    const { actions, writes, setSignInBlocked, deleteAuthAccounts } = setup({ rows: demoted });

    await expect(actions.addUser("new@watertech.uz", "manager", null)).resolves.toMatchObject({ code: "unauthorized" });
    await expect(actions.setRole(OPERATOR, "manager")).resolves.toMatchObject({ code: "unauthorized" });
    await expect(actions.setActive(OPERATOR, false)).resolves.toMatchObject({ code: "unauthorized" });
    await expect(actions.removeUser(OPERATOR, false, OPERATOR)).resolves.toMatchObject({ code: "unauthorized" });

    expect(writes()).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("rejects a malformed email or role as validation, without a request", async () => {
    const { actions, requests } = setup();

    await expect(actions.addUser("not-an-email", "operator", null)).resolves.toMatchObject({
      ok: false,
      code: "validation",
      field: "email",
    });
    await expect(actions.setRole(OPERATOR, "owner")).resolves.toMatchObject({ code: "validation", field: "role" });
    await expect(actions.setActive(OPERATOR, "false")).resolves.toMatchObject({ code: "validation", field: "active" });
    await expect(actions.addUser(OPERATOR, "operator", "x".repeat(121))).resolves.toMatchObject({
      code: "validation",
      field: "fullName",
    });

    expect(requests).toEqual([]);
  });

  it("never asks for the admin role: it is not assignable, so it is refused as validation", async () => {
    const { actions, requests } = setup();

    await expect(actions.addUser("new@watertech.uz", "admin", null)).resolves.toMatchObject({
      code: "validation",
      field: "role",
    });
    await expect(actions.setRole(OPERATOR, "admin")).resolves.toMatchObject({ code: "validation", field: "role" });
    await expect(actions.setRole(MANAGER, "admin")).resolves.toMatchObject({ code: "validation", field: "role" });

    expect(requests).toEqual([]);
  });
});

describe("addUser", () => {
  it("inserts an active row with the email trimmed and lowercased, then lifts any old ban", async () => {
    const { actions, writes, events } = setup();

    const result = await actions.addUser("  New.Person@WaterTech.UZ ", "operator", "  Yangi Xodim ");

    expect(result).toEqual({ ok: true });
    const [insert] = writes();
    expect(insert?.method).toBe("POST");
    expect(insert?.url.pathname).toBe("/rest/v1/allowed_users");
    expect(insert?.body).toEqual({
      email: "new.person@watertech.uz",
      role: "operator",
      full_name: "Yangi Xodim",
      is_active: true,
    });
    // An upsert would re-role or reactivate an existing row behind the admin's back.
    expect(insert?.url.searchParams.get("on_conflict")).toBeNull();
    expect(events).toEqual(["db:POST", "auth:unban:new.person@watertech.uz"]);
  });

  it("adds a sales manager, and stores an empty full name as null", async () => {
    const { actions, writes } = setup();
    await expect(actions.addUser("new@watertech.uz", "manager", "   ")).resolves.toEqual({ ok: true });
    expect(writes()[0]?.body).toMatchObject({ role: "manager", full_name: null });
  });

  it("answers email_taken on a duplicate, and does not touch Supabase Auth", async () => {
    const { actions, setSignInBlocked } = setup({ write: () => pgError("23505", "duplicate key") });

    await expect(actions.addUser(OPERATOR, "operator", null)).resolves.toEqual({
      ok: false,
      code: "email_taken",
      field: "email",
    });
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("maps the database guard's WT403 to unauthorized and WT462 to admin_locked", async () => {
    for (const [sqlstate, code] of [
      ["WT403", "unauthorized"],
      ["WT462", "admin_locked"],
    ] as const) {
      const { actions, setSignInBlocked } = setup({ write: () => pgError(sqlstate) });
      await expect(actions.addUser("new@watertech.uz", "operator", null)).resolves.toEqual({ ok: false, code });
      expect(setSignInBlocked).not.toHaveBeenCalled();
    }
  });

  it("reports auth_sync_failed when the row was added but the unban failed", async () => {
    const { actions, writes } = setup({ signIn: "failed" });
    await expect(actions.addUser("new@watertech.uz", "operator", null)).resolves.toEqual({
      ok: false,
      code: "auth_sync_failed",
    });
    expect(writes()).toHaveLength(1);
  });
});

describe("setRole", () => {
  it("updates only the role of that one row — operator to manager", async () => {
    const { actions, writes, setSignInBlocked } = setup();

    await expect(actions.setRole(" Aziza@WaterTech.uz ", "manager")).resolves.toEqual({ ok: true });

    const [patch] = writes();
    expect(patch?.method).toBe("PATCH");
    expect(patch?.url.searchParams.get("email")).toBe(`eq.${OPERATOR}`);
    expect(patch?.body).toEqual({ role: "manager" });
    // A role change is not a session change: no ban, no unban.
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("turns a sales manager back into an operator", async () => {
    const { actions, writes } = setup();
    await expect(actions.setRole(MANAGER, "operator")).resolves.toEqual({ ok: true });
    expect(writes()[0]?.body).toEqual({ role: "operator" });
  });

  it("refuses the caller's own demotion as self_change, with no write", async () => {
    const { actions, writes } = setup();
    await expect(actions.setRole(ME, "operator")).resolves.toEqual({ ok: false, code: "self_change" });
    expect(writes()).toEqual([]);
  });

  it("refuses the last active admin's demotion as last_admin (checked before self)", async () => {
    const alone: Row[] = [
      { email: ME, role: "admin", is_active: true },
      { email: OTHER_ADMIN, role: "admin", is_active: false },
    ];
    const { actions, writes } = setup({ rows: alone });
    await expect(actions.setRole(ME, "operator")).resolves.toEqual({ ok: false, code: "last_admin" });
    expect(writes()).toEqual([]);
  });

  it("refuses to demote another admin as admin_locked — admin rows are SQL-editor-only", async () => {
    const { actions, writes } = setup();
    await expect(actions.setRole(OTHER_ADMIN, "manager")).resolves.toEqual({ ok: false, code: "admin_locked" });
    await expect(actions.setRole(INACTIVE_ADMIN, "operator")).resolves.toEqual({ ok: false, code: "admin_locked" });
    expect(writes()).toEqual([]);
  });

  it("answers not_found for an email with no row", async () => {
    const { actions, writes } = setup();
    await expect(actions.setRole("ghost@watertech.uz", "manager")).resolves.toEqual({ ok: false, code: "not_found" });
    expect(writes()).toEqual([]);
  });

  it("skips the write when the role is already the requested one", async () => {
    const { actions, writes } = setup();
    await expect(actions.setRole(OPERATOR, "operator")).resolves.toEqual({ ok: true });
    expect(writes()).toEqual([]);
  });

  it("still maps the database's own refusals by SQLSTATE when the TS check passed (a concurrent change)", async () => {
    for (const [sqlstate, code] of [
      ["WT460", "last_admin"],
      ["WT461", "self_change"],
      ["WT462", "admin_locked"],
      ["WT403", "unauthorized"],
      ["42501", "unauthorized"],
      ["23514", "validation"],
      ["XX000", "unknown"],
    ] as const) {
      const { actions } = setup({ write: () => pgError(sqlstate) });
      await expect(actions.setRole(OPERATOR, "manager")).resolves.toEqual({ ok: false, code });
    }
  });

  it("never passes the database's message through", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { actions } = setup({ write: () => pgError("WT462", "allowed_users: admin rows are changed in the SQL editor only") });

    const result = await actions.setRole(OPERATOR, "manager");
    expect(JSON.stringify(result)).not.toContain("SQL editor only");
    logged.mockRestore();
  });

  it("answers not_found when the update matched no row (RLS hid it, or it vanished)", async () => {
    const { actions } = setup({ write: () => ({ status: 200, body: [] }) });
    await expect(actions.setRole(OPERATOR, "manager")).resolves.toEqual({ ok: false, code: "not_found" });
  });
});

describe("setActive", () => {
  it("deactivates the row first, then bans — in that order", async () => {
    const { actions, writes, events } = setup();

    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: true });

    expect(writes()[0]?.body).toEqual({ is_active: false });
    expect(events).toEqual(["db:PATCH", `auth:ban:${OPERATOR}`]);
  });

  it("deactivates a sales manager the same way", async () => {
    const { actions, events } = setup();
    await expect(actions.setActive(MANAGER, false)).resolves.toEqual({ ok: true });
    expect(events).toEqual(["db:PATCH", `auth:ban:${MANAGER}`]);
  });

  it("reactivates the row first, then unbans", async () => {
    const rows: Row[] = BASE_ROWS.map((row) => (row.email === OPERATOR ? { ...row, is_active: false } : row));
    const { actions, writes, events } = setup({ rows });

    await expect(actions.setActive(OPERATOR, true)).resolves.toEqual({ ok: true });

    expect(writes()[0]?.body).toEqual({ is_active: true });
    expect(events).toEqual(["db:PATCH", `auth:unban:${OPERATOR}`]);
  });

  it("does not ban when the database refused the deactivation", async () => {
    const { actions, setSignInBlocked } = setup({ write: () => pgError("WT462") });
    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: false, code: "admin_locked" });
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("refuses the caller's own deactivation as self_change, with no write and no ban", async () => {
    const { actions, writes, setSignInBlocked } = setup();
    await expect(actions.setActive(ME, false)).resolves.toEqual({ ok: false, code: "self_change" });
    expect(writes()).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("never deactivates, bans or reactivates another admin (admin_locked)", async () => {
    const { actions, writes, setSignInBlocked } = setup();
    await expect(actions.setActive(OTHER_ADMIN, false)).resolves.toEqual({ ok: false, code: "admin_locked" });
    await expect(actions.setActive(INACTIVE_ADMIN, true)).resolves.toEqual({ ok: false, code: "admin_locked" });
    expect(writes()).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("on an admin row already in the requested state, only brings the ban in line with the row", async () => {
    const { actions, writes, events } = setup();
    await expect(actions.setActive(OTHER_ADMIN, true)).resolves.toEqual({ ok: true });
    expect(writes()).toEqual([]);
    expect(events).toEqual([`auth:unban:${OTHER_ADMIN}`]);
  });

  it("reports auth_sync_failed when the row changed but the ban did not", async () => {
    const { actions, writes } = setup({ signIn: "failed" });
    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: false, code: "auth_sync_failed" });
    expect(writes()).toHaveLength(1);
  });

  it("treats a throwing ban (e.g. no service-role key) as auth_sync_failed, not unknown", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { actions } = setup({ signIn: "throw" });

    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: false, code: "auth_sync_failed" });
    expect(JSON.stringify(logged.mock.calls)).not.toContain(OPERATOR);
    logged.mockRestore();
  });

  it("retries only the ban when the row is already inactive (the auth_sync_failed retry)", async () => {
    const rows: Row[] = BASE_ROWS.map((row) => (row.email === OPERATOR ? { ...row, is_active: false } : row));
    const { actions, writes, events } = setup({ rows });

    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: true });
    expect(writes()).toEqual([]);
    expect(events).toEqual([`auth:ban:${OPERATOR}`]);
  });

  it("treats an account that never signed in as done", async () => {
    const { actions } = setup({ signIn: "no_account" });
    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: true });
  });
});

describe("removeUser", () => {
  it("refuses a confirmation that is not the email, as validation on confirmEmail, before any request", async () => {
    const { actions, requests, deleteAuthAccounts } = setup();

    for (const typed of ["", "aziza@watertech.u", "someone@watertech.uz", `${OPERATOR}x`]) {
      await expect(actions.removeUser(OPERATOR, false, typed)).resolves.toEqual({
        ok: false,
        code: "validation",
        field: "confirmEmail",
        details: ["confirmMismatch"],
      });
    }
    expect(requests).toEqual([]);
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean purge flag or a non-string confirmation as validation", async () => {
    const { actions, requests } = setup();
    await expect(actions.removeUser(OPERATOR, "yes", OPERATOR)).resolves.toMatchObject({
      code: "validation",
      field: "purgeHistory",
    });
    await expect(actions.removeUser(OPERATOR, false, 42)).resolves.toMatchObject({
      code: "validation",
      field: "confirmEmail",
    });
    await expect(actions.removeUser("not-an-email", false, "not-an-email")).resolves.toMatchObject({
      code: "validation",
      field: "email",
    });
    expect(requests).toEqual([]);
  });

  it("removes an operator: the Auth account, then the row — trimmed and lowercased on both sides", async () => {
    const { actions, writes, events, deleteAuthAccounts } = setup();

    await expect(actions.removeUser(" Aziza@WaterTech.uz ", false, "  AZIZA@watertech.UZ")).resolves.toEqual({ ok: true });

    expect(events).toEqual([`auth:delete:${OPERATOR}`, "db:DELETE"]);
    expect(deleteAuthAccounts).toHaveBeenCalledWith(OPERATOR);
    const [remove] = writes();
    expect(remove?.url.pathname).toBe("/rest/v1/allowed_users");
    expect(remove?.url.searchParams.get("email")).toBe(`eq.${OPERATOR}`);
    // The deleted row comes back, so "matched nothing" is told apart from success.
    expect(remove?.url.searchParams.get("select")).toBe("email");
  });

  it("with purgeHistory, purges between the Auth delete and the row delete", async () => {
    const { actions, writes, events } = setup();

    await expect(actions.removeUser(MANAGER, true, MANAGER)).resolves.toEqual({ ok: true });

    expect(events).toEqual([`auth:delete:${MANAGER}`, "db:rpc:admin_purge_person_history", "db:DELETE"]);
    const [purge] = writes();
    expect(purge?.method).toBe("POST");
    expect(purge?.body).toEqual({ p_email: MANAGER });
  });

  it("treats an email that never signed in (no Auth account) as nothing to delete", async () => {
    const { actions, events } = setup({ accountDelete: "no_account" });
    await expect(actions.removeUser(OPERATOR, true, OPERATOR)).resolves.toEqual({ ok: true });
    expect(events).toEqual([`auth:delete:${OPERATOR}`, "db:rpc:admin_purge_person_history", "db:DELETE"]);
  });

  it("answers not_found for an email with no row, touching nothing", async () => {
    const ghost = "ghost@watertech.uz";
    const { actions, writes, deleteAuthAccounts } = setup();
    await expect(actions.removeUser(ghost, true, ghost)).resolves.toEqual({ ok: false, code: "not_found" });
    expect(writes()).toEqual([]);
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("never removes an admin row, active or not (admin_locked), and touches nothing", async () => {
    const { actions, writes, deleteAuthAccounts } = setup();
    await expect(actions.removeUser(OTHER_ADMIN, true, OTHER_ADMIN)).resolves.toEqual({ ok: false, code: "admin_locked" });
    await expect(actions.removeUser(INACTIVE_ADMIN, false, INACTIVE_ADMIN)).resolves.toEqual({
      ok: false,
      code: "admin_locked",
    });
    expect(writes()).toEqual([]);
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("refuses the caller's own row as self_change while another admin is active", async () => {
    const { actions, writes, deleteAuthAccounts } = setup();
    await expect(actions.removeUser(ME, true, ME)).resolves.toEqual({ ok: false, code: "self_change" });
    expect(writes()).toEqual([]);
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("refuses the last active admin's row as last_admin (checked before self)", async () => {
    const alone: Row[] = [
      { email: ME, role: "admin", is_active: true },
      { email: OTHER_ADMIN, role: "admin", is_active: false },
    ];
    const { actions, writes, deleteAuthAccounts } = setup({ rows: alone });
    await expect(actions.removeUser(ME, false, ME)).resolves.toEqual({ ok: false, code: "last_admin" });
    expect(writes()).toEqual([]);
    expect(deleteAuthAccounts).not.toHaveBeenCalled();
  });

  it("stops at auth_sync_failed when Supabase Auth does not confirm — history and row untouched", async () => {
    const { actions, writes, events } = setup({ accountDelete: "failed" });
    await expect(actions.removeUser(OPERATOR, true, OPERATOR)).resolves.toEqual({ ok: false, code: "auth_sync_failed" });
    expect(writes()).toEqual([]);
    expect(events).toEqual([`auth:delete:${OPERATOR}`]);
  });

  it("treats a throwing Auth delete (e.g. no service-role key) as auth_sync_failed, never logging the email", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { actions, writes } = setup({ accountDelete: "throw" });

    await expect(actions.removeUser(OPERATOR, true, OPERATOR)).resolves.toEqual({ ok: false, code: "auth_sync_failed" });
    expect(writes()).toEqual([]);
    expect(JSON.stringify(logged.mock.calls)).not.toContain(OPERATOR);
    logged.mockRestore();
  });

  it("leaves the row in place when the purge fails, with the refusal collapsed into a code", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [sqlstate, code] of [
      ["XX000", "unknown"],
      ["PGRST202", "unknown"],
      ["WT403", "unauthorized"],
      ["42501", "unauthorized"],
      ["WT400", "validation"],
      ["WT461", "self_change"],
      ["WT462", "admin_locked"],
    ] as const) {
      const { actions, events } = setup({ rpc: () => pgError(sqlstate, "admin_purge_person_history: refused") });
      const result = await actions.removeUser(OPERATOR, true, OPERATOR);
      expect(result).toEqual({ ok: false, code });
      expect(JSON.stringify(result)).not.toContain("admin_purge_person_history");
      expect(events).toEqual([`auth:delete:${OPERATOR}`, "db:rpc:admin_purge_person_history"]);
    }
    logged.mockRestore();
  });

  it("maps the database's refusals of the row delete by SQLSTATE (a concurrent change)", async () => {
    for (const [sqlstate, code] of [
      ["WT460", "last_admin"],
      ["WT461", "self_change"],
      ["WT462", "admin_locked"],
      ["WT403", "unauthorized"],
      ["42501", "unauthorized"],
      ["XX000", "unknown"],
    ] as const) {
      const { actions } = setup({ write: () => pgError(sqlstate) });
      await expect(actions.removeUser(OPERATOR, false, OPERATOR)).resolves.toEqual({ ok: false, code });
    }
  });

  it("never passes the database's message through", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { actions } = setup({ write: () => pgError("WT462", "allowed_users: admin rows are changed in the SQL editor only") });
    const result = await actions.removeUser(OPERATOR, false, OPERATOR);
    expect(JSON.stringify(result)).not.toContain("SQL editor only");
    logged.mockRestore();
  });

  it("answers not_found when the delete matched no row (RLS hid it, or it was removed meanwhile)", async () => {
    const { actions } = setup({ write: () => ({ status: 200, body: [] }) });
    await expect(actions.removeUser(OPERATOR, false, OPERATOR)).resolves.toEqual({ ok: false, code: "not_found" });
  });

  it("finishes the job on a retry after a failure part-way", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    // First attempt: the Auth account goes, the purge fails. Second attempt:
    // the account is already gone, the purge and the row delete go through.
    let purgeCalls = 0;
    const { actions, events } = setup({
      accountDelete: (call) => (call === 1 ? "applied" : "no_account"),
      rpc: () => {
        purgeCalls += 1;
        return purgeCalls === 1 ? pgError("XX000") : { status: 200, body: PURGED };
      },
    });

    await expect(actions.removeUser(OPERATOR, true, OPERATOR)).resolves.toEqual({ ok: false, code: "unknown" });
    await expect(actions.removeUser(OPERATOR, true, OPERATOR)).resolves.toEqual({ ok: true });

    expect(events).toEqual([
      `auth:delete:${OPERATOR}`,
      "db:rpc:admin_purge_person_history",
      `auth:delete:${OPERATOR}`,
      "db:rpc:admin_purge_person_history",
      "db:DELETE",
    ]);
    logged.mockRestore();
  });

  it("finishes on a retry after the row delete failed, too", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    let deletes = 0;
    const { actions, events } = setup({
      accountDelete: (call) => (call === 1 ? "applied" : "no_account"),
      write: () => {
        deletes += 1;
        return deletes === 1 ? pgError("XX000") : { status: 200, body: [{ email: OPERATOR }] };
      },
    });

    await expect(actions.removeUser(OPERATOR, false, OPERATOR)).resolves.toEqual({ ok: false, code: "unknown" });
    await expect(actions.removeUser(OPERATOR, false, OPERATOR)).resolves.toEqual({ ok: true });
    expect(events).toEqual([`auth:delete:${OPERATOR}`, "db:DELETE", `auth:delete:${OPERATOR}`, "db:DELETE"]);
    logged.mockRestore();
  });
});
