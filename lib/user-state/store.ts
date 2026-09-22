import { createClient } from "@/lib/supabase/client";
import { DAILY_KEY_PREFIX, dateKey, type UserStateKeyDef } from "@/lib/user-state/keys";
import { LEGACY_OWNER_MARKER_KEY, legacyBelongsTo } from "@/lib/user-state/legacy";
import {
  mergeUserState,
  parseCacheEntry,
  parseStoredValue,
  serializeCacheEntry,
  UNKNOWN_UPDATED_AT,
  type StoredValue,
} from "@/lib/user-state/merge";
import {
  deriveOwnerId,
  legacyStorageKeys,
  ownerCacheKey,
  ownerCachePrefix,
  ownerQueueKey,
  parseOwnerCacheKey,
  USER_STATE_QUEUE_KEY,
} from "@/lib/user-state/owner";
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
 * (lib/security/csp.ts).
 *
 * Everything the store holds — in memory and in localStorage — belongs to
 * exactly one owner (lib/user-state/owner.ts). Operators share office PCs, so
 * that is a security boundary, not bookkeeping: storage keys are namespaced
 * by owner id, and every path that could merge, cache or upload a value first
 * checks that the owner it started under is still the owner now. A different
 * account means the store starts from nothing rather than inheriting — and
 * uploading — the last operator's pins, recents, onboarding and script
 * position. */

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
/** One hydration thunk per key the page has mounted, keyed by the key string.
 * Doubles as the "already ensured" set and as the way an account switch
 * reloads every mounted key under the new session. */
const rehydrators = new Map<string, () => void>();
const dirty = new Set<string>();

let queue: WriteQueue = {};
let queueLoaded = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let sending = false;
/** Set by stopUserStateSends() when a sign-out or an account switch begins.
 * Nothing is persisted or uploaded again until resumeUserStateSends(). */
let stopped = false;
let prunedDay: string | null = null;

/** Owner of everything currently in memory: `undefined` before the first
 * resolution, then the signed-in owner id, or null when there is no session
 * (or no Web Crypto to derive an id with — in which case nothing is read
 * from storage and nothing is uploaded). */
let owner: string | null | undefined;
let ownerResolution: Promise<string | null> | null = null;
/** The owner whose un-namespaced entries may still be read, set by
 * reconcileLegacy() when the `wt-us-owner` marker matches. */
let legacyOwner: string | null = null;

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

/** Every localStorage key, or an empty list where storage is unavailable. */
function localKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null) keys.push(key);
    }
  } catch {
    // Private mode or a blocked origin — nothing to enumerate or clean up.
  }
  return keys;
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

// --- owner ------------------------------------------------------------------

/** The owner id this store runs under, resolved once per session and reused
 * by every hydration, commit and send. Resolving is asynchronous (SHA-256 via
 * Web Crypto, over an email that itself comes from an async session read), so
 * every storage read is too — which is also what keeps hashing and
 * localStorage off the render path (CLAUDE.md sections 3-4). */
function resolveOwner(): Promise<string | null> {
  if (!ownerResolution) ownerResolution = computeOwner();
  return ownerResolution;
}

async function computeOwner(): Promise<string | null> {
  const email = await currentEmail();
  const next = await deriveOwnerId(email);
  applyOwner(next);
  return next;
}

/** The owner guard. Anything held in memory was read under one owner id;
 * a different one means it is someone else's, so it goes — entries, the
 * dirty set, the debounce timer and the pending queue — before a single
 * value can be merged into the new account or uploaded under its JWT.
 *
 * The first resolution is not a switch: the store started empty and nothing
 * has been read from storage yet (every read waits on this), so whatever is
 * in memory was written by this page under the session that is now being
 * confirmed. Dropping it there would lose a write made in the first few
 * milliseconds after load. */
function applyOwner(next: string | null): void {
  if (owner === next) return;

  const switching = owner !== undefined;
  if (switching) dropLocalState();
  owner = next;
  if (next) reconcileLegacy(next);

  if (switching) {
    for (const rehydrate of [...rehydrators.values()]) rehydrate();
  } else if (dirty.size > 0) {
    scheduleCommit();
  }
}

/** Everything the store holds for the previous owner, forgotten in one pass.
 * Subscribers are notified so the UI falls back to each key's default instead
 * of keeping another operator's value on screen. */
function dropLocalState(): void {
  cancelScheduledCommit();
  dirty.clear();
  queue = {};
  queueLoaded = false;
  prunedDay = null;
  legacyOwner = null;

  const keys = [...entries.keys()];
  entries.clear();
  for (const key of keys) notify(key);
}

/** Decides once per owner what happens to the un-namespaced entries: adopt
 * them when `wt-us-owner` names this owner, otherwise delete them unread.
 * The marker is then set to the current owner, so the next account to sign in
 * here finds a mismatch rather than an absent marker. */
function reconcileLegacy(ownerId: string): void {
  const mine = legacyBelongsTo(readLocal(LEGACY_OWNER_MARKER_KEY), ownerId);
  legacyOwner = mine ? ownerId : null;
  if (!mine) {
    for (const key of legacyStorageKeys(localKeys())) removeLocal(key);
  }
  writeLocal(LEGACY_OWNER_MARKER_KEY, ownerId);
}

/** Tells the store which session it is running under instead of letting it
 * read the session itself — called by SessionProvider on load and on every
 * auth change, so an account switch applies the owner guard immediately
 * rather than at the next hydration. */
export async function setUserStateSession(email: string | null): Promise<string | null> {
  cachedEmail = email;
  ownerResolution = computeOwner();
  return ownerResolution;
}

/** Blocks every further persist and upload and drops what was waiting to be
 * uploaded. First step of any purge: the account it belonged to is already
 * gone, so a flush that started now would write it under the next JWT.
 * Deliberately one-way — only resumeUserStateSends() lifts it. */
export function stopUserStateSends(): void {
  stopped = true;
  cancelScheduledCommit();
  dirty.clear();
  queue = {};
  // Marked loaded so nothing reloads the persisted queue between here and
  // the moment it is deleted from storage.
  queueLoaded = true;
}

/** Returns the store to its just-loaded state: nothing in memory, no owner,
 * no cached session email. Does not lift the send block — sign-out leaves it
 * in place for the rest of the page's life, an account switch calls
 * resumeUserStateSends() straight after. */
export function resetUserStateStore(): void {
  cancelScheduledCommit();
  dirty.clear();
  queue = {};
  queueLoaded = false;
  sending = false;
  prunedDay = null;
  owner = undefined;
  ownerResolution = null;
  legacyOwner = null;
  cachedEmail = undefined;

  const keys = [...entries.keys()];
  entries.clear();
  for (const key of keys) notify(key);
}

/** Lifts the send block and re-runs hydration for every key this page has
 * mounted, under whatever session is current now. Used when the page stays
 * open across an account change — the new operator's own values load in
 * place of the ones that were just dropped. */
export function resumeUserStateSends(): void {
  stopped = false;
  for (const rehydrate of [...rehydrators.values()]) rehydrate();
}

// --- hydration --------------------------------------------------------------

function loadQueue(ownerId: string) {
  if (queueLoaded) return;
  queueLoaded = true;
  queue = parseQueue(readLocal(ownerQueueKey(ownerId)));

  // The pre-namespacing queue is only ever this operator's when the marker
  // says so. Adopting it keeps offline writes made before the upgrade from
  // being lost; it is moved under the namespaced key at once, so an empty
  // queue later cannot pick it up a second time.
  if (Object.keys(queue).length === 0 && legacyOwner === ownerId) {
    queue = parseQueue(readLocal(USER_STATE_QUEUE_KEY));
    removeLocal(USER_STATE_QUEUE_KEY);
    if (Object.keys(queue).length > 0) persistQueue(ownerId);
  }
}

function persistQueue(ownerId: string) {
  writeLocal(ownerQueueKey(ownerId), serializeQueue(queue));
}

/** Newest of what the cache holds and what is still waiting to be uploaded —
 * a pending write is normally at least as new as the cached copy, but a
 * cross-tab write may have landed in the cache since. */
function localFor<T>(def: UserStateKeyDef<T>, ownerId: string): StoredValue<T> | null {
  const cached = parseCacheEntry(readLocal(ownerCacheKey(ownerId, def.key)), def.schema);
  loadQueue(ownerId);
  const pending = queue[def.key];
  const queued = pending ? parseStoredValue({ value: pending.value, updatedAt: pending.updatedAt }, def.schema) : null;
  if (cached && queued) return queued.updatedAt > cached.updatedAt ? queued : cached;
  return cached ?? queued;
}

/** Default -> localStorage cache -> server, in that order, each step only
 * replacing the one before it when it is actually newer. The default is
 * published synchronously so the key has a value from the first paint; the
 * cache cannot be read before the owner is known. */
export function ensure<T>(def: UserStateKeyDef<T>): void {
  if (rehydrators.has(def.key)) return;

  const run = () => {
    void hydrate(def);
  };
  rehydrators.set(def.key, run);
  publish(def.key, { value: def.defaultValue, updatedAt: UNKNOWN_UPDATED_AT, status: "loading", hasLocal: false });
  run();
}

async function hydrate<T>(def: UserStateKeyDef<T>): Promise<void> {
  const ownerId = await resolveOwner();
  if (owner !== ownerId) return; // The session changed again while resolving.

  if (!ownerId) {
    // Signed out, or no owner id could be derived: nothing in storage can be
    // proved to be this operator's, so the key stays at its default.
    publish(def.key, { value: def.defaultValue, updatedAt: UNKNOWN_UPDATED_AT, status: "ready", hasLocal: false });
    return;
  }

  let local = localFor(def, ownerId);
  if (!local && def.importLegacy && legacyOwner === ownerId) {
    // Nothing of this key's own yet: pull in whatever the pre-user_state
    // component wrote, with an unknown age so any server row beats it. Only
    // reached when the owner marker vouched for those keys.
    local = parseStoredValue({ value: def.importLegacy(readLocal), updatedAt: UNKNOWN_UPDATED_AT }, def.schema);
  }
  if (owner !== ownerId) return;

  publish(def.key, {
    value: local ? local.value : def.defaultValue,
    updatedAt: local?.updatedAt ?? UNKNOWN_UPDATED_AT,
    status: "ready",
    hasLocal: !!local,
  });

  await syncFromServer(def, ownerId);
}

async function syncFromServer<T>(def: UserStateKeyDef<T>, ownerId: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const email = await currentEmail();
  if (!email) return; // Signed out — nothing of this user's to read.
  if (owner !== ownerId) return;

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
    if (owner !== ownerId) return;
    const current = entries.get(def.key);
    if (current) publish(def.key, { ...current, status: "error" });
    return;
  }

  // The owner is re-checked after every await: an account switch in another
  // tab must not have this response merged into the new session's state, and
  // must not turn the previous operator's local value into an upload.
  if (owner !== ownerId) return;

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

  if (merged.needsUpload && !stopped) {
    queueWrite(def.key, merged.value, merged.updatedAt, ownerId);
    persistQueue(ownerId);
    writeLocal(ownerCacheKey(ownerId, def.key), serializeCacheEntry({ value: merged.value, updatedAt: merged.updatedAt }));
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
  if (stopped) return;
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

function queueWrite(key: string, value: unknown, updatedAt: string, ownerId: string) {
  loadQueue(ownerId);
  queue = enqueueWrite(queue, { key, value, updatedAt });
}

/** Writes every changed key to the localStorage cache and the pending queue
 * in one pass, then tries to send. Safe to call synchronously on pagehide:
 * everything that must not be lost is written before the first await.
 *
 * Nothing is written while the owner is unknown — the key it would be written
 * under does not exist yet. The value stays in memory and in `dirty`, and the
 * commit that follows the owner's resolution persists it. */
function commit() {
  cancelScheduledCommit();
  if (stopped || dirty.size === 0) return;

  const ownerId = owner;
  if (!ownerId) return;

  let touchedDay: string | null = null;
  for (const key of dirty) {
    const entry = entries.get(key);
    if (!entry) continue;
    writeLocal(ownerCacheKey(ownerId, key), serializeCacheEntry({ value: entry.value, updatedAt: entry.updatedAt }));
    queueWrite(key, entry.value, entry.updatedAt, ownerId);
    if (key.startsWith(DAILY_KEY_PREFIX)) touchedDay = key.slice(DAILY_KEY_PREFIX.length);
  }
  dirty.clear();
  persistQueue(ownerId);

  if (touchedDay) pruneDaily(touchedDay, ownerId);
  void send();
}

/** Drops `daily.*` rows outside the kept window — locally right away, on the
 * server as one range delete. Keys sort in date order, so `key < cutoff`
 * selects exactly the expired days and nothing else (the next key family
 * alphabetically, `pins`, sorts after every `daily.` key). Once per day per
 * tab: the set can only shrink further after the first pass. */
function pruneDaily(today: string, ownerId: string) {
  if (prunedDay === today) return;
  prunedDay = today;

  const prefix = ownerCachePrefix(ownerId);
  const cached: string[] = [];
  for (const storageKey of localKeys()) {
    if (storageKey.startsWith(prefix + DAILY_KEY_PREFIX)) cached.push(storageKey.slice(prefix.length));
  }
  for (const stale of staleDailyKeys(cached, today)) removeLocal(prefix + stale);

  const cutoff = dailyCutoffKey(today);
  void (async () => {
    const email = await currentEmail();
    if (!email || stopped || owner !== ownerId) return;
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
 * commit — same shape as the telemetry flush in lib/telemetry/client.ts.
 *
 * The owner is confirmed before the first upload and re-checked before every
 * one after it: a purge or an account switch that begins mid-drain stops it
 * where it stands, so nothing queued under one account reaches another's. */
async function send(): Promise<void> {
  if (sending || stopped) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  // Claimed before the first await: resolving the owner is asynchronous, so a
  // flag set after it would let two callers (commit() and flush() on the same
  // tick) drain the queue at once and upload every write twice.
  sending = true;
  try {
    const ownerId = await resolveOwner();
    if (!ownerId || stopped || owner !== ownerId) return;

    loadQueue(ownerId);
    if (Object.keys(queue).length === 0) return;

    for (const write of pendingWrites(queue)) {
      if (stopped || owner !== ownerId) break;
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
        if (stopped || owner !== ownerId) break;
        const failed = entries.get(write.key);
        if (failed) publish(write.key, { ...failed, status: "error" });
        break;
      }
      if (stopped || owner !== ownerId) break;
      queue = dequeueWrite(queue, write.key, write.updatedAt);
      persistQueue(ownerId);
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
function adoptFromOtherTab(storageKey: string) {
  const parsed = parseOwnerCacheKey(storageKey);
  // A write under a different owner id is another account's tab: ignore it
  // outright rather than letting it reach a key this operator is showing.
  if (!parsed || parsed.ownerId !== owner) return;

  const entry = entries.get(parsed.key);
  if (!entry) return;
  const raw = readLocal(storageKey);
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
  publish(parsed.key, { value: envelope.v, updatedAt, status: "ready", hasLocal: true });
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
    if (event.key) adoptFromOtherTab(event.key);
  });
}

export { dateKey };
