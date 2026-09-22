import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pinsKey, scriptsPositionKey } from "@/lib/user-state/keys";
import { LEGACY_OWNER_MARKER_KEY, LEGACY_SCRIPT_KEY } from "@/lib/user-state/legacy";
import { serializeCacheEntry } from "@/lib/user-state/merge";
import { deriveOwnerId, ownerCacheKey, ownerQueueKey, USER_STATE_QUEUE_KEY } from "@/lib/user-state/owner";
import { installBrowserGlobals, type BrowserGlobals } from "@/tests/stubs/browser-globals";

/**
 * The owner guard, end to end against a fake localStorage and a fake Supabase
 * client. These are the shared-PC cases: operator B must never see, merge or
 * upload anything of operator A's, however the switch happens.
 *
 * The store keeps module-level state on purpose, so every test re-imports it
 * after vi.resetModules() — that is what "a fresh page load" means here.
 */

const EMAIL_A = "operator.a@watertech.uz";
const EMAIL_B = "operator.b@watertech.uz";

interface Upsert {
  key: string;
  value: unknown;
  updated_at: string;
}

interface Row {
  value: unknown;
  updated_at: string;
}

type Operation = "select" | "upsert";

/** Stands in for the browser Supabase client: one `user_state` table keyed by
 * (email, key), a recording of every upsert so a test can assert nothing was
 * uploaded, and a way to hold one operation open mid-flight. */
class SupabaseStub {
  email: string | null = null;
  readonly rows = new Map<string, Row>();
  readonly upserts: { email: string | null; write: Upsert }[] = [];

  private readonly blocked: Record<Operation, Promise<void> | null> = { select: null, upsert: null };

  readonly auth = {
    getSession: async () => ({ data: { session: this.email ? { user: { email: this.email } } : null } }),
    signOut: async () => ({ error: null }),
  };

  from(table: string) {
    if (table !== "user_state") throw new Error(`unexpected table ${table}`);
    const stub = this;

    return {
      select: () => {
        const filters: Record<string, string> = {};
        const builder = {
          eq(column: string, value: string) {
            filters[column] = value;
            return builder;
          },
          async maybeSingle() {
            await stub.hold("select");
            return { data: stub.rows.get(rowKey(filters.user_email, filters.key)) ?? null, error: null };
          },
        };
        return builder;
      },
      async upsert(write: Upsert) {
        await stub.hold("upsert");
        stub.upserts.push({ email: stub.email, write });
        if (stub.email) stub.rows.set(rowKey(stub.email, write.key), { value: write.value, updated_at: write.updated_at });
        return { error: null };
      },
      delete: () => {
        const builder = { eq: () => builder, gte: () => builder, lt: async () => ({ error: null }) };
        return builder;
      },
    };
  }

  /** Holds the next call of `operation` until the returned release runs. */
  block(operation: Operation): () => void {
    let release = () => {};
    this.blocked[operation] = new Promise<void>((resolve) => {
      release = resolve;
    });
    return release;
  }

  seed(email: string, key: string, row: Row): void {
    this.rows.set(rowKey(email, key), row);
  }

  private async hold(operation: Operation): Promise<void> {
    const blocked = this.blocked[operation];
    if (!blocked) return;
    this.blocked[operation] = null;
    await blocked;
  }
}

function rowKey(email: string | undefined, key: string | undefined): string {
  return `${email ?? ""}\u0000${key ?? ""}`;
}

let supabase: SupabaseStub;
let globals: BrowserGlobals;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => supabase,
}));

type Store = typeof import("@/lib/user-state/store");

/** A fresh page load under `email`. */
async function loadStore(email: string | null): Promise<Store> {
  vi.resetModules();
  const store: Store = await import("@/lib/user-state/store");
  supabase.email = email;
  await store.setUserStateSession(email);
  return store;
}

/** Lets hydration, merges and sends run to completion — setImmediate rather
 * than setTimeout(0), which Windows clamps to a far coarser tick. */
async function settle(): Promise<void> {
  for (let i = 0; i < 16; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

async function ownerOf(email: string): Promise<string> {
  return (await deriveOwnerId(email)) ?? "";
}

beforeEach(() => {
  supabase = new SupabaseStub();
  globals = installBrowserGlobals();
});

afterEach(() => {
  globals.uninstall();
});

describe("namespaced storage", () => {
  it("writes the cache and the queue under the owner's namespace only", async () => {
    const ownerA = await ownerOf(EMAIL_A);
    const store = await loadStore(EMAIL_A);

    store.ensure(pinsKey);
    await settle();
    store.setValue(pinsKey, [{ kind: "script", id: "lead-orqali-tushgan" }]);
    store.flush();
    await settle();

    expect(globals.local.getItem(ownerCacheKey(ownerA, "pins"))).toContain("lead-orqali-tushgan");
    expect(globals.local.getItem("wt-us:pins")).toBeNull();
    expect(globals.local.getItem(USER_STATE_QUEUE_KEY)).toBeNull();
    expect(globals.local.keys().filter((key) => key.startsWith("wt-us-queue"))).toEqual([ownerQueueKey(ownerA)]);
  });

  it("keeps two operators' values apart in the same browser", async () => {
    const ownerA = await ownerOf(EMAIL_A);
    const ownerB = await ownerOf(EMAIL_B);

    const asA = await loadStore(EMAIL_A);
    asA.ensure(pinsKey);
    await settle();
    asA.setValue(pinsKey, [{ kind: "script", id: "a-only" }]);
    asA.flush();
    await settle();

    const asB = await loadStore(EMAIL_B);
    asB.ensure(pinsKey);
    await settle();

    // B starts from the default, not from A's cached value.
    expect(asB.getEntry("pins").hasLocal).toBe(false);
    expect(globals.local.getItem(ownerCacheKey(ownerA, "pins"))).toContain("a-only");
    expect(globals.local.getItem(ownerCacheKey(ownerB, "pins"))).toBeNull();
    // Nothing of A's was uploaded under B's session.
    expect(supabase.upserts.filter((row) => row.email === EMAIL_B)).toHaveLength(0);
  });

  it("restores the same owner's queued writes after a reload and sends them", async () => {
    const ownerA = await ownerOf(EMAIL_A);
    globals.local.setItem(
      ownerQueueKey(ownerA),
      JSON.stringify({
        pins: { key: "pins", value: [{ kind: "faq", id: "offline-write" }], updatedAt: "2026-09-22T09:00:00.000Z" },
      })
    );

    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    await settle();

    expect(store.getEntry("pins").value).toEqual([{ kind: "faq", id: "offline-write" }]);
    expect(supabase.upserts.map((row) => row.write.key)).toContain("pins");
    expect(supabase.upserts.every((row) => row.email === EMAIL_A)).toBe(true);
  });
});

describe("owner guard", () => {
  it("refuses the merge when the account changes while the read is in flight", async () => {
    supabase.seed(EMAIL_A, "pins", {
      value: [{ kind: "script", id: "a-server" }],
      updated_at: "2026-09-22T08:00:00.000Z",
    });
    const store = await loadStore(EMAIL_A);

    const release = supabase.block("select");
    store.ensure(pinsKey);
    await settle();
    expect(store.getEntry("pins").status).toBe("ready");

    // B signs in in another tab while A's row is still on its way back.
    supabase.email = EMAIL_B;
    await store.setUserStateSession(EMAIL_B);
    release();
    await settle();

    expect(store.getEntry("pins").value).not.toEqual([{ kind: "script", id: "a-server" }]);
    expect(supabase.upserts.filter((row) => row.email === EMAIL_B)).toHaveLength(0);
  });

  it("drops the previous operator's entries, dirty set and queue on an account change", async () => {
    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    await settle();
    // Deliberately not flushed: the value is in memory and in `dirty`.
    store.setValue(pinsKey, [{ kind: "product", id: "a-pending" }]);

    supabase.email = EMAIL_B;
    await store.setUserStateSession(EMAIL_B);
    await settle();

    expect(store.getEntry("pins").hasLocal).toBe(false);
    expect(globals.local.getItem(ownerCacheKey(await ownerOf(EMAIL_B), "pins"))).toBeNull();
    expect(supabase.upserts.filter((row) => row.email === EMAIL_B)).toHaveLength(0);
  });

  it("ignores a cache write from another account's tab", async () => {
    const ownerB = await ownerOf(EMAIL_B);
    const store = await loadStore(EMAIL_A);
    store.installGlobalListeners();
    store.ensure(pinsKey);
    await settle();

    const before = store.getEntry("pins").value;
    globals.local.setItem(
      ownerCacheKey(ownerB, "pins"),
      serializeCacheEntry({ value: [{ kind: "script", id: "b-tab" }], updatedAt: "2099-01-01T00:00:00.000Z" })
    );
    globals.dispatchStorage(ownerCacheKey(ownerB, "pins"));

    expect(store.getEntry("pins").value).toEqual(before);
  });

  it("still takes a cache write from the same account's other tab", async () => {
    const ownerA = await ownerOf(EMAIL_A);
    const store = await loadStore(EMAIL_A);
    store.installGlobalListeners();
    store.ensure(pinsKey);
    await settle();

    globals.local.setItem(
      ownerCacheKey(ownerA, "pins"),
      serializeCacheEntry({ value: [{ kind: "script", id: "a-tab" }], updatedAt: "2099-01-01T00:00:00.000Z" })
    );
    globals.dispatchStorage(ownerCacheKey(ownerA, "pins"));

    expect(store.getEntry("pins").value).toEqual([{ kind: "script", id: "a-tab" }]);
  });
});

describe("purge", () => {
  it("never sends the pending queue once sends have stopped", async () => {
    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    await settle();
    store.setValue(pinsKey, [{ kind: "objection", id: "obj-qimmat" }]);

    store.stopUserStateSends();
    store.flush();
    await settle();

    expect(supabase.upserts).toHaveLength(0);
    expect(globals.local.getItem(ownerQueueKey(await ownerOf(EMAIL_A)))).toBeNull();
  });

  it("stops a drain that is already running", async () => {
    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    store.ensure(scriptsPositionKey);
    await settle();

    store.setValue(pinsKey, [{ kind: "faq", id: "one" }]);
    store.setValue(scriptsPositionKey, { scriptId: "two", stageId: null });

    const release = supabase.block("upsert");
    store.flush();
    await settle();

    // The first upload is in flight; the purge begins now.
    store.stopUserStateSends();
    release();
    await settle();

    expect(supabase.upserts.length).toBeLessThanOrEqual(1);
  });

  it("forgets the session email, so nothing more is read or written for it", async () => {
    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    await settle();

    store.stopUserStateSends();
    store.resetUserStateStore();
    supabase.email = null;
    store.resumeUserStateSends();
    await settle();

    expect(store.getEntry("pins").hasLocal).toBe(false);
    expect(supabase.upserts).toHaveLength(0);
  });
});

describe("legacy adoption", () => {
  it("adopts un-namespaced entries when the marker names this owner", async () => {
    globals.local.setItem(LEGACY_OWNER_MARKER_KEY, await ownerOf(EMAIL_A));
    globals.local.setItem(LEGACY_SCRIPT_KEY, "lead-orqali-tushgan");

    const store = await loadStore(EMAIL_A);
    store.ensure(scriptsPositionKey);
    await settle();

    expect(store.getEntry("scripts.position").value).toEqual({ scriptId: "lead-orqali-tushgan", stageId: null });
    // Read, never deleted — the original data is still there to import again.
    expect(globals.local.getItem(LEGACY_SCRIPT_KEY)).toBe("lead-orqali-tushgan");
  });

  it("deletes un-namespaced entries unread when the marker names someone else", async () => {
    globals.local.setItem(LEGACY_OWNER_MARKER_KEY, await ownerOf(EMAIL_B));
    globals.local.setItem(
      "wt-us:pins",
      serializeCacheEntry({ value: [{ kind: "script", id: "b-legacy" }], updatedAt: "2026-09-20T00:00:00.000Z" })
    );
    globals.local.setItem(
      USER_STATE_QUEUE_KEY,
      JSON.stringify({ pins: { key: "pins", value: [], updatedAt: "2026-09-20T00:00:00.000Z" } })
    );
    globals.local.setItem(LEGACY_SCRIPT_KEY, "b-script");

    const store = await loadStore(EMAIL_A);
    store.ensure(scriptsPositionKey);
    store.ensure(pinsKey);
    await settle();

    expect(globals.local.getItem("wt-us:pins")).toBeNull();
    expect(globals.local.getItem(USER_STATE_QUEUE_KEY)).toBeNull();
    expect(globals.local.getItem(LEGACY_SCRIPT_KEY)).toBeNull();
    expect(store.getEntry("scripts.position").hasLocal).toBe(false);
    expect(store.getEntry("pins").hasLocal).toBe(false);
    expect(supabase.upserts).toHaveLength(0);
  });

  it("deletes un-namespaced entries when there is no marker at all", async () => {
    globals.local.setItem(
      "wt-us:pins",
      serializeCacheEntry({ value: [{ kind: "script", id: "unknown" }], updatedAt: "2026-09-20T00:00:00.000Z" })
    );
    globals.local.setItem(LEGACY_SCRIPT_KEY, "unknown-script");

    const store = await loadStore(EMAIL_A);
    store.ensure(scriptsPositionKey);
    await settle();

    expect(globals.local.getItem("wt-us:pins")).toBeNull();
    expect(globals.local.getItem(LEGACY_SCRIPT_KEY)).toBeNull();
    expect(store.getEntry("scripts.position").hasLocal).toBe(false);
    expect(supabase.upserts).toHaveLength(0);
  });

  it("leaves the marker naming the current owner", async () => {
    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    await settle();

    expect(globals.local.getItem(LEGACY_OWNER_MARKER_KEY)).toBe(await ownerOf(EMAIL_A));
  });

  it("adopts the pre-namespacing queue only for the owner the marker names", async () => {
    globals.local.setItem(LEGACY_OWNER_MARKER_KEY, await ownerOf(EMAIL_A));
    globals.local.setItem(
      USER_STATE_QUEUE_KEY,
      JSON.stringify({
        pins: { key: "pins", value: [{ kind: "faq", id: "queued" }], updatedAt: "2026-09-21T00:00:00.000Z" },
      })
    );

    const store = await loadStore(EMAIL_A);
    store.ensure(pinsKey);
    await settle();

    expect(store.getEntry("pins").value).toEqual([{ kind: "faq", id: "queued" }]);
    expect(supabase.upserts.map((row) => row.write.key)).toContain("pins");
    // Moved under the namespaced key, so it cannot be picked up twice.
    expect(globals.local.getItem(USER_STATE_QUEUE_KEY)).toBeNull();
  });
});
