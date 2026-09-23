import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { userAccessActions, type UserAccessDeps } from "@/lib/admin/actions/user-access";
import { AdminActionError } from "@/lib/admin/errors";
import type { SignInBlockResult } from "@/lib/auth/ban";
import type { Database } from "@/lib/supabase/database.types";

// The guards on /admin/users' three actions. Same approach as
// factory.test.ts: the query builder is the real supabase-js one and only the
// network is mocked, so what is asserted is the PostgREST traffic itself —
// above all, that a refused change sends no write at all, and that a
// deactivation writes the allow-list row BEFORE it bans.

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

const ME = "manager@watertech.uz";
const OTHER_MANAGER = "boss@watertech.uz";
const OPERATOR = "aziza@watertech.uz";

const BASE_ROWS: Row[] = [
  { email: ME, role: "manager", is_active: true },
  { email: OTHER_MANAGER, role: "manager", is_active: true },
  { email: OPERATOR, role: "operator", is_active: true },
];

/** A PostgREST error body — supabase-js reads `code` off it. */
function pgError(code: string, message = "refused"): MockResponse {
  return { status: 400, body: { code, message, details: null, hint: null } };
}

interface Setup {
  rows?: Row[];
  /** What a PATCH / POST answers; defaults to success. */
  write?: (request: RecordedRequest) => MockResponse;
  session?: string | "none";
  signIn?: SignInBlockResult | "throw";
}

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
    if (request.method === "GET") {
      const email = url.searchParams.get("email")?.replace(/^eq\./, "");
      const onlyManagers = url.searchParams.get("role") === "eq.manager";
      const matching = rows.filter((row) =>
        email !== undefined ? row.email === email : onlyManagers ? row.role === "manager" && row.is_active : true
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

  const deps: UserAccessDeps = {
    requireSession: async () => {
      if (options.session === "none") throw new AdminActionError("unauthorized");
      return { email: options.session ?? ME };
    },
    client: () => supabase,
    setSignInBlocked,
  };

  const writes = () => requests.filter((request) => request.method !== "GET");
  return { actions: userAccessActions(deps), requests, writes, events, setSignInBlocked };
}

describe("every action", () => {
  it("refuses a caller who is not a signed-in manager before any request", async () => {
    const { actions, requests, setSignInBlocked } = setup({ session: "none" });

    await expect(actions.addUser(OPERATOR, "operator", null)).resolves.toEqual({ ok: false, code: "unauthorized" });
    await expect(actions.setRole(OPERATOR, "manager")).resolves.toEqual({ ok: false, code: "unauthorized" });
    await expect(actions.setActive(OPERATOR, false)).resolves.toEqual({ ok: false, code: "unauthorized" });

    expect(requests).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("refuses a manager token whose allow-list row is no longer an active manager (stale JWT)", async () => {
    const demoted: Row[] = [
      { email: ME, role: "operator", is_active: true },
      { email: OTHER_MANAGER, role: "manager", is_active: true },
      { email: OPERATOR, role: "operator", is_active: true },
    ];
    const { actions, writes, setSignInBlocked } = setup({ rows: demoted });

    await expect(actions.addUser("new@watertech.uz", "manager", null)).resolves.toMatchObject({ code: "unauthorized" });
    await expect(actions.setRole(ME, "manager")).resolves.toMatchObject({ code: "unauthorized" });
    await expect(actions.setActive(OPERATOR, false)).resolves.toMatchObject({ code: "unauthorized" });

    expect(writes()).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("rejects a malformed email or role as validation, without a request", async () => {
    const { actions, requests } = setup();

    await expect(actions.addUser("not-an-email", "operator", null)).resolves.toMatchObject({
      ok: false,
      code: "validation",
      field: "email",
    });
    await expect(actions.setRole(OPERATOR, "admin")).resolves.toMatchObject({ code: "validation", field: "role" });
    await expect(actions.setActive(OPERATOR, "false")).resolves.toMatchObject({ code: "validation", field: "active" });
    await expect(actions.addUser(OPERATOR, "operator", "x".repeat(121))).resolves.toMatchObject({
      code: "validation",
      field: "fullName",
    });

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
    // An upsert would re-role or reactivate an existing row behind the manager's back.
    expect(insert?.url.searchParams.get("on_conflict")).toBeNull();
    expect(events).toEqual(["db:POST", "auth:unban:new.person@watertech.uz"]);
  });

  it("stores an empty full name as null", async () => {
    const { actions, writes } = setup();
    await actions.addUser("new@watertech.uz", "manager", "   ");
    expect(writes()[0]?.body).toMatchObject({ full_name: null });
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

  it("maps the database guard's WT403 to unauthorized", async () => {
    const { actions } = setup({ write: () => pgError("WT403") });
    await expect(actions.addUser("new@watertech.uz", "operator", null)).resolves.toMatchObject({ code: "unauthorized" });
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
  it("updates only the role of that one row", async () => {
    const { actions, writes, setSignInBlocked } = setup();

    await expect(actions.setRole(" Aziza@WaterTech.uz ", "manager")).resolves.toEqual({ ok: true });

    const [patch] = writes();
    expect(patch?.method).toBe("PATCH");
    expect(patch?.url.searchParams.get("email")).toBe(`eq.${OPERATOR}`);
    expect(patch?.body).toEqual({ role: "manager" });
    // A role change is not a session change: no ban, no unban.
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("refuses the caller's own demotion as self_change, with no write", async () => {
    const { actions, writes } = setup();
    await expect(actions.setRole(ME, "operator")).resolves.toEqual({ ok: false, code: "self_change" });
    expect(writes()).toEqual([]);
  });

  it("refuses the last active manager's demotion as last_manager (checked before self)", async () => {
    const alone: Row[] = [
      { email: ME, role: "manager", is_active: true },
      { email: OTHER_MANAGER, role: "manager", is_active: false },
    ];
    const { actions, writes } = setup({ rows: alone });
    await expect(actions.setRole(ME, "operator")).resolves.toEqual({ ok: false, code: "last_manager" });
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

  it("still maps the database's own refusals when the TS check passed (a concurrent change)", async () => {
    for (const [sqlstate, code] of [
      ["WT460", "last_manager"],
      ["WT461", "self_change"],
      ["WT403", "unauthorized"],
      ["42501", "unauthorized"],
      ["XX000", "unknown"],
    ] as const) {
      const { actions } = setup({ write: () => pgError(sqlstate) });
      await expect(actions.setRole(OTHER_MANAGER, "operator")).resolves.toEqual({ ok: false, code });
    }
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

  it("reactivates the row first, then unbans", async () => {
    const rows: Row[] = [...BASE_ROWS.slice(0, 2), { email: OPERATOR, role: "operator", is_active: false }];
    const { actions, writes, events } = setup({ rows });

    await expect(actions.setActive(OPERATOR, true)).resolves.toEqual({ ok: true });

    expect(writes()[0]?.body).toEqual({ is_active: true });
    expect(events).toEqual(["db:PATCH", `auth:unban:${OPERATOR}`]);
  });

  it("does not ban when the database refused the deactivation", async () => {
    const { actions, setSignInBlocked } = setup({ write: () => pgError("WT460") });
    await expect(actions.setActive(OTHER_MANAGER, false)).resolves.toEqual({ ok: false, code: "last_manager" });
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("refuses the caller's own deactivation as self_change, with no write and no ban", async () => {
    const { actions, writes, setSignInBlocked } = setup();
    await expect(actions.setActive(ME, false)).resolves.toEqual({ ok: false, code: "self_change" });
    expect(writes()).toEqual([]);
    expect(setSignInBlocked).not.toHaveBeenCalled();
  });

  it("lets a manager deactivate another manager while one active manager remains", async () => {
    const { actions } = setup();
    await expect(actions.setActive(OTHER_MANAGER, false)).resolves.toEqual({ ok: true });
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
    const rows: Row[] = [...BASE_ROWS.slice(0, 2), { email: OPERATOR, role: "operator", is_active: false }];
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
