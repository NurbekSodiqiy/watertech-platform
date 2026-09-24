// Type-only on purpose: this module is in every page's first load, and a
// runtime import of claims.ts would move that module into this chunk
// (docs/PERF.md, R3/S01).
import type { Role } from "@/lib/auth/claims";
import { ownerBufferKey } from "@/lib/user-state/owner";
import type { TelemetryEvent, TelemetryEventType } from "./types";

const ENDPOINT = "/api/events";
const SESSION_KEY = "wt-session-id";

/** Base of the localStorage buffer key. The buffer itself always lives under
 * `<BUFFER_KEY>:<ownerId>`: the server files every event against the session
 * that posts it, so a buffer left behind by the last operator would be
 * inserted as the next one. lib/auth/purge.ts clears both this base key and
 * the owner's own. */
export const BUFFER_KEY = "wt-events-buffer";
const MAX_BUFFER = 200;
const MAX_META_BYTES = 500;
const FLUSH_INTERVAL_MS = 20000;
const FLUSH_BATCH_SIZE = 25;
const MAX_BATCH_BYTES = 4000;
const IDLE_THRESHOLD_MS = 60000;
const PERSIST_DEBOUNCE_MS = 2000;

let queue: TelemetryEvent[] = [];
let initialized = false;
let flushInFlight = false;
let lastActivity = Date.now();
let isIdle = false;
let sessionId: string | null = null;
/** Owner of everything in `queue`, and the namespace the buffer is persisted
 * under. Null until SessionProvider names one (or after a purge): events then
 * stay in memory only, so nothing outlives the page under an unknown
 * account. */
let bufferOwner: string | null = null;
/** False while the session is the admin's: telemetry records operators and
 * sales managers only (CLAUDE.md §9), so nothing is queued, persisted, restored
 * or sent. True until SessionProvider names the role — what is queued before
 * that stays in memory and is dropped then if the session turns out to be the
 * admin's. /api/events refuses an admin's batch as well; this only keeps it
 * from being built. */
let recording = true;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    sessionId = id;
  } catch {
    // sessionStorage unavailable (private mode, etc.) — one id per page load
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function cancelScheduledPersist() {
  if (persistDebounceTimer !== null) {
    clearTimeout(persistDebounceTimer);
    persistDebounceTimer = null;
  }
}

/** Synchronous serialise+write — only called where the page may not get
 * another chance to run (unload paths) or where the queue just shrank after
 * a send. Cancels any pending debounced persist so the two never race. */
function persistBuffer() {
  cancelScheduledPersist();
  // Newest MAX_BUFFER events win — oldest are dropped first when full.
  if (queue.length > MAX_BUFFER) queue = queue.slice(queue.length - MAX_BUFFER);
  // Unknown owner: in-memory only, never persisted. An admin: no buffer at all.
  if (!bufferOwner || !recording) return;
  try {
    localStorage.setItem(ownerBufferKey(BUFFER_KEY, bufferOwner), JSON.stringify(queue));
  } catch {
    // storage full/unavailable — events still live in the in-memory queue
    // for this tab, just won't survive a reload
  }
}

function runWhenIdle(fn: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 0);
  }
}

/** Trailing debounce around persistBuffer() so a burst of enqueue() calls
 * (e.g. rapid clicks) writes to localStorage once, off the main thread via
 * requestIdleCallback, instead of synchronously on every event. */
function schedulePersist() {
  cancelScheduledPersist();
  persistDebounceTimer = setTimeout(() => {
    persistDebounceTimer = null;
    runWhenIdle(persistBuffer);
  }, PERSIST_DEBOUNCE_MS);
}

/** Oldest-first slice capped at FLUSH_BATCH_SIZE events and ~MAX_BATCH_BYTES
 * of JSON — always returns at least one event (if the queue is non-empty)
 * even if that single event alone exceeds the byte cap, so an oversized
 * event can't stall the queue forever. */
function takeBatch(): TelemetryEvent[] {
  const batch: TelemetryEvent[] = [];
  let bytes = 2; // "[" + "]"
  for (const event of queue) {
    const size = JSON.stringify(event).length + 1; // +1 for the comma/brackets
    if (batch.length > 0 && bytes + size > MAX_BATCH_BYTES) break;
    batch.push(event);
    bytes += size;
    if (batch.length >= FLUSH_BATCH_SIZE) break;
  }
  return batch;
}

function removeSentFromQueue(sentCount: number) {
  queue = queue.slice(sentCount);
  persistBuffer();
}

// While events keep failing to send (session expired, server down), every
// track() call past the 25-event threshold would otherwise retrigger an
// immediate flush attempt — this holds off further attempts until the
// regular 20s interval instead of hammering the endpoint on every event.
let retryNotBeforeMs = 0;

/** Regular flush path — loops over the queue sending capped batches via a
 * keepalive fetch, so a large backlog (e.g. built up while offline) drains
 * over a few requests instead of one oversized one. Stops on the first
 * failure and leaves the remainder queued for the next attempt. */
async function flush() {
  if (flushInFlight || queue.length === 0) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (Date.now() < retryNotBeforeMs) return;

  flushInFlight = true;
  try {
    while (queue.length > 0) {
      const batch = takeBatch();
      if (batch.length === 0) break;

      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
          keepalive: true,
          // Middleware no longer intercepts /api/* — this endpoint returns
          // 401 itself when the session is missing/expired, so there's no
          // redirect for a normal fetch to silently follow here. "manual" is
          // kept anyway (harmless) in case that ever changes.
          redirect: "manual",
        });
      } catch {
        retryNotBeforeMs = Date.now() + FLUSH_INTERVAL_MS;
        break; // offline/network error — retry on the next scheduled flush
      }

      if (!res.ok) {
        retryNotBeforeMs = Date.now() + FLUSH_INTERVAL_MS;
        break; // server/auth error — retry on the next scheduled flush
      }
      retryNotBeforeMs = 0;
      removeSentFromQueue(batch.length);
    }
  } finally {
    flushInFlight = false;
  }
}

/** Last-attempt flush for when the page is going away — sendBeacon is far
 * more likely to actually complete than a fetch started during unload.
 * Best-effort, single batch only (sendBeacon has its own payload cap). */
function flushViaBeacon() {
  if (queue.length === 0 || typeof navigator?.sendBeacon !== "function") return;
  const batch = takeBatch();
  if (batch.length === 0) return;
  try {
    const blob = new Blob([JSON.stringify(batch)], { type: "application/json" });
    const accepted = navigator.sendBeacon(ENDPOINT, blob);
    if (accepted) removeSentFromQueue(batch.length);
  } catch {
    // leave it queued — nothing else to do at this point
  }
}

function currentPath(): string {
  return typeof window !== "undefined" ? window.location.pathname : "";
}

function markActivity() {
  lastActivity = Date.now();
  if (isIdle) {
    isIdle = false;
    enqueue({ type: "idle_end", path: currentPath() });
  }
}

function checkIdle() {
  if (!isIdle && Date.now() - lastActivity >= IDLE_THRESHOLD_MS) {
    isIdle = true;
    enqueue({ type: "idle_start", path: currentPath() });
  }
}

function enqueue(partial: Omit<TelemetryEvent, "sessionId" | "ts">) {
  // Also stops idle_start / idle_end, which the activity listeners enqueue
  // directly when they were installed before the role was known.
  if (!recording) return;
  let meta = partial.meta;
  if (meta && JSON.stringify(meta).length > MAX_META_BYTES) {
    meta = { truncated: true };
  }
  queue.push({ sessionId: getSessionId(), ts: Date.now(), ...partial, meta });
  schedulePersist();
  if (queue.length >= FLUSH_BATCH_SIZE) runWhenIdle(flush);
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const activityOpts: AddEventListenerOptions = { passive: true };
  (["mousemove", "mousedown", "keydown", "click", "scroll", "touchstart"] as const).forEach((evt) =>
    window.addEventListener(evt, markActivity, activityOpts)
  );

  setInterval(() => {
    checkIdle();
    if (queue.length > 0) runWhenIdle(flush);
  }, FLUSH_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushViaBeacon();
      persistBuffer();
    }
  });
  window.addEventListener("pagehide", () => {
    flushViaBeacon();
    persistBuffer();
  });
}

/** Names the account this page's events belong to, and its role. Called by
 * SessionProvider on load and on every auth change, so a shared browser can
 * never carry one account's buffered events into the next one's session:
 * a different owner drops the in-memory queue first, then restores only that
 * owner's own buffer. The un-namespaced buffer from before namespacing is
 * deleted rather than restored — nothing proves who wrote it.
 *
 * An admin session is not recorded at all: whatever is queued goes, no buffer
 * is restored or written, and track() does nothing until a recorded role is
 * named again. The role is applied before the same-owner shortcut below,
 * because one account's role can change at a token refresh. */
export function setTelemetryOwner(ownerId: string | null, role: Role | null): void {
  recording = role !== "admin";
  if (!recording) queue = [];

  if (bufferOwner === ownerId) return;

  cancelScheduledPersist();
  // Events queued before any owner was known were produced by this page load,
  // under the session that is only now being named — they are this owner's
  // and are kept. A change between two known accounts is the opposite case:
  // everything queued belongs to the one that is leaving, and goes, along
  // with the telemetry session id that tied those events together.
  if (bufferOwner !== null) {
    queue = [];
    resetSessionId();
  }
  bufferOwner = ownerId;
  if (typeof window === "undefined") return;

  try {
    // Never restored: the un-namespaced buffer predates namespacing, so
    // nothing proves whose events it holds.
    localStorage.removeItem(BUFFER_KEY);
    if (!ownerId || !recording) return;
    const saved = localStorage.getItem(ownerBufferKey(BUFFER_KEY, ownerId));
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    // The restored buffer is older than anything queued in this page load.
    if (Array.isArray(parsed)) queue = [...(parsed as TelemetryEvent[]), ...queue];
  } catch {
    // corrupt or unavailable buffer — start with what is in memory
  } finally {
    // Whatever was queued before the owner was known has had nowhere to be
    // persisted until now; give it a namespace to survive a reload in.
    if (queue.length > 0) schedulePersist();
  }
}

function resetSessionId(): void {
  sessionId = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sessionStorage unavailable — the in-memory id is already cleared.
  }
}

/** Drops what is buffered in memory and stops anything further being
 * persisted or sent, synchronously. First step of a purge: `flush()` posts
 * with whatever session cookie the browser holds, so an event queued under
 * the account that is leaving must not still be in `queue` once the next one
 * signs in. */
export function stopTelemetryBuffering(): void {
  cancelScheduledPersist();
  queue = [];
  bufferOwner = null;
  resetSessionId();
}

/** Removes the buffers themselves, after stopTelemetryBuffering() has already
 * emptied the queue. `ownerId` null clears every account's buffer — the
 * fail-closed direction when the signing-out account is unknown. */
export function purgeTelemetryBuffer(ownerId: string | null): void {
  stopTelemetryBuffering();
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(BUFFER_KEY);
    if (ownerId) {
      localStorage.removeItem(ownerBufferKey(BUFFER_KEY, ownerId));
      return;
    }
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${BUFFER_KEY}:`)) localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — the in-memory queue is already gone.
  }
}

/** Queues a telemetry event (in memory + localStorage) for the next flush.
 * Safe to call from anywhere client-side; a no-op during SSR and for an admin
 * session — which then installs no listeners and no flush timer either. */
export function track(partial: Omit<TelemetryEvent, "sessionId" | "ts">) {
  if (typeof window === "undefined" || !recording) return;
  ensureInitialized();
  markActivity();
  enqueue(partial);
}

export type { TelemetryEvent, TelemetryEventType };
