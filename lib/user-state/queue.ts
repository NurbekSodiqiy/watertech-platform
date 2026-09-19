/** Writes that have not reached the database yet — because the operator is
 * offline, the request failed, or the tab was closed before the debounce
 * fired. Persisted in localStorage so they survive a reload and are flushed
 * on the next `online` event (hooks/useUserState.ts).
 *
 * One pending write per key: a key written three times while offline uploads
 * once, with the last value. That is exactly the same "newest wins" rule the
 * merge uses, applied before the write instead of after it. */
export interface PendingWrite {
  key: string;
  value: unknown;
  updatedAt: string;
}

export type WriteQueue = Record<string, PendingWrite>;

/** Distinct keys allowed to pile up. Far more than the handful of keys this
 * app actually has — the cap only exists so a bug cannot grow the queue
 * without bound; the oldest writes are dropped first. */
export const MAX_QUEUED_KEYS = 50;

export function enqueueWrite(queue: WriteQueue, write: PendingWrite): WriteQueue {
  const existing = queue[write.key];
  // A stale write (an `online` retry racing a fresh edit) must not overwrite
  // the newer value already waiting.
  if (existing && existing.updatedAt > write.updatedAt) return queue;

  const next: WriteQueue = { ...queue, [write.key]: write };
  const keys = Object.keys(next);
  if (keys.length <= MAX_QUEUED_KEYS) return next;

  const dropped = keys
    .sort((a, b) => next[a].updatedAt.localeCompare(next[b].updatedAt))
    .slice(0, keys.length - MAX_QUEUED_KEYS);
  for (const key of dropped) delete next[key];
  return next;
}

/** Removes a write only if it is still the one that was sent — a value
 * changed again while the request was in flight stays queued. */
export function dequeueWrite(queue: WriteQueue, key: string, updatedAt: string): WriteQueue {
  const existing = queue[key];
  if (!existing || existing.updatedAt !== updatedAt) return queue;
  const next = { ...queue };
  delete next[key];
  return next;
}

/** Oldest first, so a backlog replays in the order it was created. */
export function pendingWrites(queue: WriteQueue): PendingWrite[] {
  return Object.values(queue).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export function serializeQueue(queue: WriteQueue): string {
  return JSON.stringify(queue);
}

/** Never throws: a corrupt or partially-written queue starts empty rather
 * than breaking every hook on the page. Entries that are not shaped like a
 * PendingWrite are dropped individually. */
export function parseQueue(raw: string | null): WriteQueue {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const queue: WriteQueue = {};
  for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as { key?: unknown; value?: unknown; updatedAt?: unknown };
    if (candidate.key !== key || typeof candidate.updatedAt !== "string" || candidate.value === undefined) continue;
    queue[key] = { key, value: candidate.value, updatedAt: candidate.updatedAt };
  }
  return queue;
}
