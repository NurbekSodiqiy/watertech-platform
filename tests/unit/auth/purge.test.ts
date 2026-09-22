import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PURGE_ACK_TIMEOUT_MS, PURGE_USER_CACHES, USER_CACHES_PURGED } from "@/lib/pwa/sw-messages";
import { LEGACY_OWNER_MARKER_KEY, LEGACY_SCRIPT_KEY } from "@/lib/user-state/legacy";
import { deriveOwnerId, ownerBufferKey, ownerCacheKey, ownerQueueKey } from "@/lib/user-state/owner";
import { installBrowserGlobals, type BrowserGlobals } from "@/tests/stubs/browser-globals";

/**
 * The purge as the sign-out button and SessionProvider actually call it:
 * which keys leave the browser, which stay, and what happens when the service
 * worker does or does not answer.
 */

const EMAIL_A = "operator.a@watertech.uz";
const EMAIL_B = "operator.b@watertech.uz";
const BUFFER = "wt-events-buffer";

/** The store reaches for the Supabase client on import; nothing here needs it
 * to do anything, only to exist. */
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }), signOut: async () => ({ error: null }) },
    from: () => {
      throw new Error("no queries expected during a purge");
    },
  }),
}));

type Purge = typeof import("@/lib/auth/purge");

let globals: BrowserGlobals;

async function loadPurge(): Promise<Purge> {
  vi.resetModules();
  return import("@/lib/auth/purge");
}

beforeEach(() => {
  globals = installBrowserGlobals();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "navigator");
  globals.uninstall();
  vi.useRealTimers();
});

describe("purgeLocalUserData", () => {
  it("removes this owner's entries and every un-namespaced one, and keeps the other operator's", async () => {
    const ownerA = (await deriveOwnerId(EMAIL_A)) ?? "";
    const ownerB = (await deriveOwnerId(EMAIL_B)) ?? "";

    globals.local.setItem(ownerCacheKey(ownerA, "pins"), "{}");
    globals.local.setItem(ownerQueueKey(ownerA), "{}");
    globals.local.setItem(ownerBufferKey(BUFFER, ownerA), "[]");
    globals.local.setItem(ownerCacheKey(ownerB, "pins"), "{}");
    globals.local.setItem(ownerQueueKey(ownerB), "{}");
    globals.local.setItem(ownerBufferKey(BUFFER, ownerB), "[]");
    globals.local.setItem("wt-us:pins", "{}");
    globals.local.setItem("wt-us-queue", "{}");
    globals.local.setItem(BUFFER, "[]");
    globals.local.setItem(LEGACY_OWNER_MARKER_KEY, ownerA);
    globals.local.setItem(LEGACY_SCRIPT_KEY, "lead-orqali-tushgan");
    globals.local.setItem("watertech-theme", "dark");
    globals.session.setItem("wt-session-id", "abc");

    const purge = await loadPurge();
    await purge.purgeLocalUserData({ email: EMAIL_A, resumeSends: false });

    expect(globals.local.keys().sort()).toEqual([ownerBufferKey(BUFFER, ownerB), ownerCacheKey(ownerB, "pins"), ownerQueueKey(ownerB), "watertech-theme"].sort());
    expect(globals.session.length).toBe(0);
  });

  it("clears every account's entries when the signing-out address is unknown", async () => {
    const ownerA = (await deriveOwnerId(EMAIL_A)) ?? "";
    const ownerB = (await deriveOwnerId(EMAIL_B)) ?? "";
    globals.local.setItem(ownerCacheKey(ownerA, "pins"), "{}");
    globals.local.setItem(ownerCacheKey(ownerB, "pins"), "{}");
    globals.local.setItem(ownerQueueKey(ownerB), "{}");
    globals.local.setItem("watertech-theme", "light");

    const purge = await loadPurge();
    await purge.purgeLocalUserData({ email: null, resumeSends: false });

    expect(globals.local.keys()).toEqual(["watertech-theme"]);
  });
});

/** Minimal stand-in for `navigator.serviceWorker.controller`. */
function installController(controller: { postMessage: (message: unknown, transfer: unknown[]) => void } | null) {
  Object.defineProperty(globalThis, "navigator", {
    value: { serviceWorker: { controller } },
    configurable: true,
    writable: true,
  });
}

describe("purgeServiceWorkerCaches", () => {
  it("resolves true once the worker acknowledges on the port it was given", async () => {
    const purge = await loadPurge();
    installController({
      postMessage(message, transfer) {
        expect(message).toEqual({ type: PURGE_USER_CACHES });
        const port = transfer[0] as MessagePort;
        port.postMessage({ type: USER_CACHES_PURGED, deleted: ["pages"] });
      },
    });

    await expect(purge.purgeServiceWorkerCaches()).resolves.toBe(true);
  });

  it("resolves false on an answer it does not recognise", async () => {
    const purge = await loadPurge();
    installController({
      postMessage(_message, transfer) {
        (transfer[0] as MessagePort).postMessage({ type: "SOMETHING_ELSE" });
      },
    });

    await expect(purge.purgeServiceWorkerCaches()).resolves.toBe(false);
  });

  it("gives up after the timeout rather than holding the sign-out open", async () => {
    vi.useFakeTimers();
    const purge = await loadPurge();
    installController({ postMessage: () => {} }); // A worker that never answers.

    const pending = purge.purgeServiceWorkerCaches();
    await vi.advanceTimersByTimeAsync(PURGE_ACK_TIMEOUT_MS + 1);

    await expect(pending).resolves.toBe(false);
  });

  it("resolves false when there is no worker at all", async () => {
    const purge = await loadPurge();
    installController(null);
    await expect(purge.purgeServiceWorkerCaches()).resolves.toBe(false);
  });

  it("resolves false when postMessage throws", async () => {
    const purge = await loadPurge();
    installController({
      postMessage() {
        throw new Error("worker gone");
      },
    });

    await expect(purge.purgeServiceWorkerCaches()).resolves.toBe(false);
  });
});
