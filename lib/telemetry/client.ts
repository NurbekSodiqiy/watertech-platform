import type { TelemetryEvent, TelemetryEventType } from "./types";

const ENDPOINT = "/api/events";
const SESSION_KEY = "wt-session-id";
const BUFFER_KEY = "wt-events-buffer";
const MAX_BUFFER = 500;
const FLUSH_INTERVAL_MS = 20000;
const FLUSH_BATCH_SIZE = 25;
const MAX_BATCH_BYTES = 4000;
const IDLE_THRESHOLD_MS = 60000;

let queue: TelemetryEvent[] = [];
let initialized = false;
let flushInFlight = false;
let lastActivity = Date.now();
let isIdle = false;
let sessionId: string | null = null;

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

function persistBuffer() {
  // Newest MAX_BUFFER events win — oldest are dropped first when full.
  if (queue.length > MAX_BUFFER) queue = queue.slice(queue.length - MAX_BUFFER);
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(queue));
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
  queue.push({ sessionId: getSessionId(), ts: Date.now(), ...partial });
  persistBuffer();
  if (queue.length >= FLUSH_BATCH_SIZE) runWhenIdle(flush);
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const saved = localStorage.getItem(BUFFER_KEY);
    if (saved) queue = JSON.parse(saved);
  } catch {
    // corrupt or unavailable buffer — start empty
  }

  const activityOpts: AddEventListenerOptions = { passive: true };
  (["mousemove", "mousedown", "keydown", "click", "scroll", "touchstart"] as const).forEach((evt) =>
    window.addEventListener(evt, markActivity, activityOpts)
  );

  setInterval(() => {
    checkIdle();
    if (queue.length > 0) runWhenIdle(flush);
  }, FLUSH_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushViaBeacon();
  });
  window.addEventListener("pagehide", flushViaBeacon);
}

/** Queues a telemetry event (in memory + localStorage) for the next flush.
 * Safe to call from anywhere client-side; a no-op during SSR. */
export function track(partial: Omit<TelemetryEvent, "sessionId" | "ts">) {
  if (typeof window === "undefined") return;
  ensureInitialized();
  markActivity();
  enqueue(partial);
}

export type { TelemetryEvent, TelemetryEventType };
