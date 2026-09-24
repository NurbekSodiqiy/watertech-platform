import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ownerBufferKey } from "@/lib/user-state/owner";
import { installBrowserGlobals, type BrowserGlobals } from "@/tests/stubs/browser-globals";

/**
 * The telemetry buffer is the third way one operator's data could end up
 * filed under another's: the server takes the identity of an event from the
 * session that posts it, so anything left buffered by the last account is
 * inserted as the next one. These cover the namespacing that prevents it.
 */

const BUFFER = "wt-events-buffer";
const SESSION_KEY = "wt-session-id";
const OWNER_A = "0123456789abcdef";
const OWNER_B = "fedcba9876543210";

type Client = typeof import("@/lib/telemetry/client");

let globals: BrowserGlobals;

async function loadClient(): Promise<Client> {
  vi.resetModules();
  return import("@/lib/telemetry/client");
}

/** The shape persistBuffer() writes, close enough for a restore. */
function events(...types: string[]): string {
  return JSON.stringify(types.map((type, index) => ({ sessionId: "s", ts: index, type, path: "/" })));
}

/** Runs the 2 s persist debounce and the idle callback behind it. Fake
 * timers throughout: advanceTimersByTimeAsync flushes the microtasks between
 * them, and nothing here should depend on wall-clock time. */
async function persist(): Promise<void> {
  await vi.advanceTimersByTimeAsync(5000);
}

beforeEach(() => {
  globals = installBrowserGlobals();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  globals.uninstall();
});

/** Stands in for the network: /api/events answers 200, and every call is
 * recorded, so "nothing was sent" is an assertion rather than an absence. */
function stubFetch() {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const bufferKeys = () => globals.local.keys().filter((key) => key.startsWith(BUFFER));

describe("an admin session records nothing (CLAUDE.md §9)", () => {
  it("queues, persists and sends nothing — past the batch size and the flush interval", async () => {
    const fetchMock = stubFetch();
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "admin");

    for (let i = 0; i < 30; i += 1) client.track({ type: "page_enter", path: `/page-${i}` });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(bufferKeys()).toEqual([]);
  });

  it("sends a sales manager's events (the positive control for the test above)", async () => {
    const fetchMock = stubFetch();
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "manager");

    // A full batch flushes at once; no need to reach the interval (or, in this
    // stub without window.location, the idle timer).
    for (let i = 0; i < 30; i += 1) client.track({ type: "page_enter", path: `/page-${i}` });
    await vi.advanceTimersByTimeAsync(1_000);

    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/events");
  });

  it("drops what was queued before the session turned out to be the admin's", async () => {
    const fetchMock = stubFetch();
    const client = await loadClient();

    client.track({ type: "page_enter", path: "/before-session" });
    client.setTelemetryOwner(OWNER_A, "admin");
    // Past the persist debounce and one flush interval (the stub has no
    // window.location, so stay short of the 60 s idle timer).
    await vi.advanceTimersByTimeAsync(25_000);

    expect(bufferKeys()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never restores or sends a buffer the admin's account left before role model v2", async () => {
    const leftOver = events("left_over");
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_A), leftOver);
    const fetchMock = stubFetch();

    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "admin");
    client.track({ type: "page_enter", path: "/as-admin" });
    await vi.advanceTimersByTimeAsync(25_000);

    expect(fetchMock).not.toHaveBeenCalled();
    // Left as it was (sign-out purges it with the rest of the account's keys).
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toBe(leftOver);
  });

  it("stops when a token refresh makes the same account an admin, and records the next operator again", async () => {
    stubFetch();
    const client = await loadClient();

    client.setTelemetryOwner(OWNER_A, "operator");
    client.track({ type: "page_enter", path: "/as-operator" });
    await persist();
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toContain("/as-operator");

    // Same owner id, new role: the owner shortcut must not skip the role.
    client.setTelemetryOwner(OWNER_A, "admin");
    client.track({ type: "page_enter", path: "/as-admin" });
    await persist();
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).not.toContain("/as-admin");

    // The next account on this shared PC is an operator again.
    client.setTelemetryOwner(OWNER_B, "operator");
    client.track({ type: "page_enter", path: "/next-operator" });
    await persist();
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_B))).toContain("/next-operator");
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_B))).not.toContain("/as-admin");
  });
});

describe("buffer namespacing", () => {
  it("persists under the owner's own key, never the bare one", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "operator");

    client.track({ type: "page_enter", path: "/products" });
    await persist();

    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toContain("page_enter");
    expect(globals.local.getItem(BUFFER)).toBeNull();
  });

  it("restores only the buffer of the owner being adopted", async () => {
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_A), events("a_event"));
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_B), events("b_event"));

    const client = await loadClient();
    client.setTelemetryOwner(OWNER_B, "operator");
    client.track({ type: "page_enter", path: "/" });
    await persist();

    const persisted = globals.local.getItem(ownerBufferKey(BUFFER, OWNER_B)) ?? "";
    expect(persisted).toContain("b_event");
    expect(persisted).not.toContain("a_event");
    // A's buffer is untouched — it is theirs to flush when they sign back in.
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toContain("a_event");
  });

  it("deletes the pre-namespacing buffer instead of restoring it", async () => {
    globals.local.setItem(BUFFER, events("unattributable"));

    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "operator");
    client.track({ type: "page_enter", path: "/" });
    await persist();

    expect(globals.local.getItem(BUFFER)).toBeNull();
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).not.toContain("unattributable");
  });

  it("keeps events queued before the owner was known — they are this page load's", async () => {
    const client = await loadClient();

    client.track({ type: "page_enter", path: "/before-session" });
    await persist();
    // Nothing may be persisted while the owner is unknown.
    expect(globals.local.keys().filter((key) => key.startsWith(BUFFER))).toEqual([]);

    client.setTelemetryOwner(OWNER_A, "operator");
    await persist();

    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toContain("/before-session");
  });

  it("drops what the previous account queued when the owner changes", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "operator");
    client.track({ type: "page_enter", path: "/a-page" });

    client.setTelemetryOwner(OWNER_B, "operator");
    client.track({ type: "page_enter", path: "/b-page" });
    await persist();

    const persisted = globals.local.getItem(ownerBufferKey(BUFFER, OWNER_B)) ?? "";
    expect(persisted).toContain("/b-page");
    expect(persisted).not.toContain("/a-page");
  });

  it("starts a new telemetry session id on an account change", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "operator");
    client.track({ type: "page_enter", path: "/" });

    const first = globals.session.getItem(SESSION_KEY);
    expect(first).toBeTruthy();

    client.setTelemetryOwner(OWNER_B, "operator");
    client.track({ type: "page_enter", path: "/" });

    expect(globals.session.getItem(SESSION_KEY)).not.toBe(first);
  });
});

describe("purgeTelemetryBuffer", () => {
  it("removes this owner's buffer and the bare one, leaving other accounts alone", async () => {
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_B), events("b_event"));
    globals.local.setItem(BUFFER, events("legacy"));

    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "operator");
    client.track({ type: "page_enter", path: "/" });
    await persist();
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toBeTruthy();

    client.purgeTelemetryBuffer(OWNER_A);

    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toBeNull();
    expect(globals.local.getItem(BUFFER)).toBeNull();
    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_B))).toContain("b_event");
  });

  it("clears every account's buffer when the owner is unknown", async () => {
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_A), events("a_event"));
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_B), events("b_event"));
    globals.local.setItem(BUFFER, events("legacy"));

    const client = await loadClient();
    client.purgeTelemetryBuffer(null);

    expect(globals.local.keys().filter((key) => key.startsWith(BUFFER))).toEqual([]);
  });

  it("stops persisting until an owner is named again", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A, "operator");
    client.track({ type: "page_enter", path: "/" });
    await persist();

    client.purgeTelemetryBuffer(OWNER_A);
    client.track({ type: "page_enter", path: "/after-purge" });
    await persist();

    expect(globals.local.keys().filter((key) => key.startsWith(BUFFER))).toEqual([]);
  });
});
