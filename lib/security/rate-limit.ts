// Single-instance only: state lives in a module-level Map, so this resets on
// deploy/restart and does not share counts across multiple server instances.
// For a multi-instance deploy, swap the Map-backed store for Upstash/Redis
// behind this same `rateLimit()` signature.

const MAX_KEYS = 5000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const { limit, windowMs } = opts;
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = hits.get(key) ?? [];
  const recent = existing.filter((ts) => ts > windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    hits.set(key, recent);
    return { ok: false, remaining: 0, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    const oldestKey = hits.keys().next().value;
    if (oldestKey !== undefined) hits.delete(oldestKey);
  }

  return { ok: true, remaining: limit - recent.length, retryAfterSec: 0 };
}
