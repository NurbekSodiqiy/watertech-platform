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
  globals.uninstall();
});

describe("buffer namespacing", () => {
  it("persists under the owner's own key, never the bare one", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A);

    client.track({ type: "page_enter", path: "/products" });
    await persist();

    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toContain("page_enter");
    expect(globals.local.getItem(BUFFER)).toBeNull();
  });

  it("restores only the buffer of the owner being adopted", async () => {
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_A), events("a_event"));
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_B), events("b_event"));

    const client = await loadClient();
    client.setTelemetryOwner(OWNER_B);
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
    client.setTelemetryOwner(OWNER_A);
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

    client.setTelemetryOwner(OWNER_A);
    await persist();

    expect(globals.local.getItem(ownerBufferKey(BUFFER, OWNER_A))).toContain("/before-session");
  });

  it("drops what the previous account queued when the owner changes", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A);
    client.track({ type: "page_enter", path: "/a-page" });

    client.setTelemetryOwner(OWNER_B);
    client.track({ type: "page_enter", path: "/b-page" });
    await persist();

    const persisted = globals.local.getItem(ownerBufferKey(BUFFER, OWNER_B)) ?? "";
    expect(persisted).toContain("/b-page");
    expect(persisted).not.toContain("/a-page");
  });

  it("starts a new telemetry session id on an account change", async () => {
    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A);
    client.track({ type: "page_enter", path: "/" });

    const first = globals.session.getItem(SESSION_KEY);
    expect(first).toBeTruthy();

    client.setTelemetryOwner(OWNER_B);
    client.track({ type: "page_enter", path: "/" });

    expect(globals.session.getItem(SESSION_KEY)).not.toBe(first);
  });
});

describe("purgeTelemetryBuffer", () => {
  it("removes this owner's buffer and the bare one, leaving other accounts alone", async () => {
    globals.local.setItem(ownerBufferKey(BUFFER, OWNER_B), events("b_event"));
    globals.local.setItem(BUFFER, events("legacy"));

    const client = await loadClient();
    client.setTelemetryOwner(OWNER_A);
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
    client.setTelemetryOwner(OWNER_A);
    client.track({ type: "page_enter", path: "/" });
    await persist();

    client.purgeTelemetryBuffer(OWNER_A);
    client.track({ type: "page_enter", path: "/after-purge" });
    await persist();

    expect(globals.local.keys().filter((key) => key.startsWith(BUFFER))).toEqual([]);
  });
});
