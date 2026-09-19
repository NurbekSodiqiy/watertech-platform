import { createClient } from "@/lib/supabase/client";
import { DAILY_KEY_PREFIX, dateKey, type UserStateKeyDef } from "@/lib/user-state/keys";
import {
  mergeUserState,
  parseCacheEntry,
  parseStoredValue,
  serializeCacheEntry,
  UNKNOWN_UPDATED_AT,
  type StoredValue,
} from "@/lib/user-state/merge";
import { dailyCutoffKey, staleDailyKeys } from "@/lib/user-state/prune";
import {
  dequeueWrite,
  enqueueWrite,
  parseQueue,
  pendingWrites,
  serializeQueue,
  type WriteQueue,
} from "@/lib/user-state/queue";

/** The one client-side store behind hooks/useUserState.ts. Module level, not
 * React state, so every component using the same key sees the same value in
 * the same tab (useSyncExternalStore subscribes to it) without a provider
 * being threaded through AppShell.
 *
 * Reads and writes go straight to Supabase from the browser under RLS. No
 * route handler: operator pages have to stay statically prerenderable and the
 * layout must not touch cookies()/headers() (CLAUDE.md sections 3-4), and a
 * server hop would add nothing — the policies in 0009 already derive the
 * user's email from the JWT, so there is no client-supplied identity for a
 * handler to verify. connect-src already allows the Supabase origin
 * (lib/security/csp.ts). */

const CACHE_PREFIX = "wt-us:";
const QUEUE_STORAGE_KEY = "wt-us-queue";
const WRITE_DEBOUNCE_MS = 800;

export type UserStateStatus = "loading" | "ready" | "error";

export interface StoreEntry {
  value: unknown;
  updatedAt: string;
  status: UserStateStatus;
  /** False while `value` is only the key's default — nothing was found in the
   * cache, the queue, or a legacy key yet. Keeps a default from being merged
   * as if the operator had chosen it. */
  hasLocal: boolean;
}

const LOADING: StoreEntry = { value: undefined, updatedAt: UNKNOWN_UPDATED_AT, status: "loading", hasLocal: false };

const entries = new Map<string, StoreEntry>();
const listeners = new Map<string, Set<() => void>>();
const hydrated = new Set<string>();
const dirty = new Set<string>();

let queue: WriteQueue = {};
let queueLoaded = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let sending = false;
let prunedDay: string | null = null;

let cachedEmail: string | null | undefined;
let clientSingleton: ReturnType<typeof createClient> | null = null;

function supabase() {
  if (!clientSingleton) clientSingleton = createClient();
  return clientSingleton;
}

/** The signed-in email, read once from the cookie session (no network unless
 * the token needs refreshing, same as SessionProvider). Reads and deletes
 * need it because a manager's select-all policy would otherwise return every
 * operator's row for a key; writes never send it — the column defaults to the
 * JWT claim. */
async function currentEmail(): Promise<string | null> {
  if (cachedEmail !== undefined) return cachedEmail;
  try {
    const { data } = await supabase().auth.getSession();
    cachedEmail = data.session?.user?.email ?? null;
  } catch {
    cachedEmail = null;
  }
  return cachedEmail;
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable (private mode) — the value still lives in
    // memory for this tab and in the pending queue for the server.
  }
}

function removeLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function publish(key: string, entry: StoreEntry) {
  entries.set(key, entry);
  notify(key);
}

export function getEntry(key: string): StoreEntry {
  return entries.get(key) ?? LOADING;
}

/** Same object on every server render, so useSyncExternalStore's snapshot is
 * stable through SSR and the first client paint. */
export function getServerEntry(): StoreEntry {
  return LOADING;
}

export function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
  };
}

function loadQueue() {
  if (queueLoaded) return;
  queueLoaded = true;
  queue = parseQueue(readLocal(QUEUE_STORAGE_KEY));
}

function persistQueue() {
  writeLocal(QUEUE_STORAGE_KEY, serializeQueue(queue));
}

/** Newest of what the cache holds and what is still waiting to be uploaded —
 * a pending write is normally at least as new as the cached copy, but a
 * cross-tab write may have landed in the cache since. */
function localFor<T>(def: UserStateKeyDef<T>): StoredValue<T> | null {
  const cached = parseCacheEntry(readLocal(CACHE_PREFIX + def.key), def.schema);
  loadQueue();
  const pending = queue[def.key];
  const queued = pending ? parseStoredValue({ value: pending.value, updatedAt: pending.updatedAt }, def.schema) : null;
  if (cached && queued) return queued.updatedAt > cached.updatedAt ? queued : cached;
  return cached ?? queued;
}

/** Default -> localStorage cache -> server, in that order, each step only
 * replacing the one before it when it is actually newer. */
export function ensure<T>(def: UserStateKeyDef<T>): void {
  if (hydrated.has(def.key)) return;
  hydrated.add(def.key);

  let local = localFor(def);
  if (!local && def.importLegacy) {
    // Nothing of this key's own yet: pull in whatever the pre-user_state
    // component wrote, with an unknown age so any server row beats it.
    local = parseStoredValue({ value: def.importLegacy(readLocal), updatedAt: UNKNOWN_UPDATED_AT }, def.schema);
  }

  publish(def.key, {
    value: local ? local.value : def.defaultValue,
    updatedAt: local?.updatedAt ?? UNKNOWN_UPDATED_AT,
    status: "ready",
    hasLocal: !!local,
  });

  void syncFromServer(def);
}

async function syncFromServer<T>(def: UserStateKeyDef<T>): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const email = await currentEmail();
  if (!email) return; // Signed out — nothing of this user's to read.

  let remote: StoredValue<T> | null = null;
  try {
    const { data, error } = await supabase()
      .from("user_state")
      .select("value, updated_at")
      .eq("user_email", email)
      .eq("key", def.key)
      .maybeSingle();
    if (error) throw error;
    remote = data ? parseStoredValue({ value: data.value, updatedAt: data.updated_at }, def.schema) : null;
  } catch {
    const current = entries.get(def.key);
    if (current) publish(def.key, { ...current, status: "error" });
    return;
  }

  // The local side is re-read here rather than reused from ensure(): the
  // operator may have changed the value while the request was in flight.
  const current = getEntry(def.key);
  const local = current.hasLocal ? { value: current.value as T, updatedAt: current.updatedAt } : null;
  const merged = mergeUserState(local, remote, def.defaultValue, new Date().toISOString());

  publish(def.key, {
    value: merged.value,
    updatedAt: merged.updatedAt,
    status: "ready",
    hasLocal: merged.winner !== "default",
  });

  if (merged.needsUpload) {
    queueWrite(def.key, merged.value, merged.updatedAt);
    persistQueue();
    writeLocal(CACHE_PREFIX + def.key, serializeCacheEntry({ value: merged.value, updatedAt: merged.updatedAt }));
    void send();
  }
}

/** Optimistic: memory first and a re-render immediately, storage and network
 * on the debounce. */
export function setValue<T>(def: UserStateKeyDef<T>, value: T): void {
  publish(def.key, { value, updatedAt: new Date().toISOString(), status: "ready", hasLocal: true });
  dirty.add(def.key);
  scheduleCommit();
}

/** A burst of clicks or keystrokes touches localStorage once, 800 ms after
 * the last of them, instead of on every one (CLAUDE.md section 4). The
 * debounce is what keeps the work off the interaction — deliberately not
 * requestIdleCallback on top of it, which a background tab can postpone
 * indefinitely, leaving writes unsaved until the tab is closed. */
function scheduleCommit() {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    commit();
  }, WRITE_DEBOUNCE_MS);
}

function cancelScheduledCommit() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function queueWrite(key: string, value: unknown, updatedAt: string) {
  loadQueue();
  queue = enqueueWrite(queue, { key, value, updatedAt });
}

/** Writes every changed key to the localStorage cache and the pending queue
 * in one pass, then tries to send. Safe to call synchronously on pagehide:
 * everything that must not be lost is written before the first await. */
function commit() {
  cancelScheduledCommit();
  if (dirty.size === 0) return;

  let touchedDay: string | null = null;
  for (const key of dirty) {
    const entry = entries.get(key);
    if (!entry) continue;
    writeLocal(CACHE_PREFIX + key, serializeCacheEntry({ value: entry.value, updatedAt: entry.updatedAt }));
    queueWrite(key, entry.value, entry.updatedAt);
    if (key.startsWith(DAILY_KEY_PREFIX)) touchedDay = key.slice(DAILY_KEY_PREFIX.length);
  }
  dirty.clear();
  persistQueue();

  if (touchedDay) pruneDaily(touchedDay);
  void send();
}

/** Drops `daily.*` rows outside the kept window — locally right away, on the
 * server as one range delete. Keys sort in date order, so `key < cutoff`
 * selects exactly the expired days and nothing else (the next key family
 * alphabetically, `pins`, sorts after every `daily.` key). Once per day per
 * tab: the set can only shrink further after the first pass. */
function pruneDaily(today: string) {
  if (prunedDay === today) return;
  prunedDay = today;

  try {
    const cached: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(CACHE_PREFIX + DAILY_KEY_PREFIX)) cached.push(storageKey.slice(CACHE_PREFIX.length));
    }
    for (const stale of staleDailyKeys(cached, today)) removeLocal(CACHE_PREFIX + stale);
  } catch {
    // localStorage unavailable — only the server copy needs pruning then.
  }

  const cutoff = dailyCutoffKey(today);
  void (async () => {
    const email = await currentEmail();
    if (!email) return;
    try {
      await supabase()
        .from("user_state")
        .delete()
        .eq("user_email", email)
        .gte("key", DAILY_KEY_PREFIX)
        .lt("key", cutoff);
    } catch {
      // The next write tries again (a new tab, or tomorrow's first change).
    }
  })();
}

/** Drains the pending queue one key at a time, oldest first. Stops at the
 * first failure and leaves the rest queued for the next `online` event or
 * commit — same shape as the telemetry flush in lib/telemetry/client.ts. */
async function send(): Promise<void> {
  if (sending) return;
  loadQueue();
  if (Object.keys(queue).length === 0) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  sending = true;
  try {
    for (const write of pendingWrites(queue)) {
      try {
        // No user_email in the payload: the column defaults to the JWT's own
        // email claim, so identity never travels through the client.
        const { error } = await supabase()
          .from("user_state")
          .upsert(
            { key: write.key, value: write.value as never, updated_at: write.updatedAt },
            { onConflict: "user_email,key" }
          );
        if (error) throw error;
      } catch {
        const failed = entries.get(write.key);
        if (failed) publish(write.key, { ...failed, status: "error" });
        break;
      }
      queue = dequeueWrite(queue, write.key, write.updatedAt);
      persistQueue();
      const sent = entries.get(write.key);
      if (sent && sent.status === "error") publish(write.key, { ...sent, status: "ready" });
    }
  } finally {
    sending = false;
  }
}

/** Called on visibilitychange/pagehide and when the browser comes back
 * online — the page may not get another chance to run. */
export function flush(): void {
  commit();
  void send();
}

/** Another tab wrote this key: take it if it is newer than what this tab
 * holds. Nothing to upload — the tab that made the change owns that. */
function adoptFromOtherTab(cacheKey: string) {
  const key = cacheKey.slice(CACHE_PREFIX.length);
  const entry = entries.get(key);
  if (!entry) return;
  const raw = readLocal(cacheKey);
  if (!raw) return;
  let envelope: { v?: unknown; t?: unknown };
  try {
    envelope = JSON.parse(raw) as { v?: unknown; t?: unknown };
  } catch {
    return;
  }
  const updatedAt = typeof envelope.t === "string" ? envelope.t : UNKNOWN_UPDATED_AT;
  if (updatedAt <= entry.updatedAt) return;
  // Validation happens in the hook, which owns the key's schema: it re-parses
  // whatever it is handed and falls back to the default if this is not valid.
  publish(key, { value: envelope.v, updatedAt, status: "ready", hasLocal: true });
}

let listenersInstalled = false;

export function installGlobalListeners(): void {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("storage", (event) => {
    if (event.key?.startsWith(CACHE_PREFIX)) adoptFromOtherTab(event.key);
  });
}

export { dateKey };
