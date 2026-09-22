/**
 * Owner namespacing for everything this app keeps in a browser it does not
 * own. Operators share office PCs, so "what is in localStorage" is never by
 * itself evidence of whose it is — every durable key carries the id of the
 * account that wrote it, and a key whose owner cannot be proved is deleted
 * rather than read.
 *
 * The id is the first 16 hex characters of SHA-256 over the lowercased
 * email. It is a namespace, not a secret: it only has to be stable across
 * devices and reloads, and it keeps the raw address out of a storage key
 * that any script on the origin can enumerate. 64 bits is far more than the
 * ~30 accounts this app has ever had to tell apart.
 *
 * Everything here is pure except `deriveOwnerId`, which needs Web Crypto —
 * no module reads storage, so this file is safe to import from anywhere and
 * can be unit tested as it stands.
 */

import { isLegacyComponentStorageKey, LEGACY_OWNER_MARKER_KEY } from "@/lib/user-state/legacy";

/** Hex characters kept from the digest. */
export const OWNER_ID_LENGTH = 16;

const OWNER_ID_FORMAT = /^[0-9a-f]{16}$/;

/** `wt-us:<ownerId>:<key>` for a cached value, `wt-us:<key>` before
 * namespacing existed. */
export const USER_STATE_PREFIX = "wt-us:";

/** `wt-us-queue:<ownerId>` for the pending-write queue, `wt-us-queue`
 * before namespacing existed. */
export const USER_STATE_QUEUE_KEY = "wt-us-queue";

/** First 16 hex chars of SHA-256(lowercased email), or null when there is no
 * usable address or no Web Crypto (a non-secure context). Null is the
 * fail-closed answer everywhere it is used: without an owner id nothing may
 * be read from storage, written to it, or uploaded. */
export async function deriveOwnerId(email: string | null | undefined): Promise<string | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(normalized));
    let hex = "";
    for (const byte of new Uint8Array(digest, 0, OWNER_ID_LENGTH / 2)) {
      hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
  } catch {
    return null;
  }
}

export function isOwnerId(value: string | null | undefined): value is string {
  return !!value && OWNER_ID_FORMAT.test(value);
}

/** `wt-us:<ownerId>:` — the prefix every cached value of one account shares. */
export function ownerCachePrefix(ownerId: string): string {
  return `${USER_STATE_PREFIX}${ownerId}:`;
}

export function ownerCacheKey(ownerId: string, key: string): string {
  return ownerCachePrefix(ownerId) + key;
}

export function ownerQueueKey(ownerId: string): string {
  return `${USER_STATE_QUEUE_KEY}:${ownerId}`;
}

/** `<base>:<ownerId>` — for a buffer outside the `wt-us` family that needs
 * the same per-account scoping (the telemetry buffer). */
export function ownerBufferKey(base: string, ownerId: string): string {
  return `${base}:${ownerId}`;
}

/** Splits `wt-us:<ownerId>:<key>` back into its parts, or null when the key
 * is not one. A pre-namespacing `wt-us:pins` never parses: a user_state key
 * is lowercase letters, digits, dots and dashes only (isValidUserStateKey),
 * so it can never look like an owner segment followed by a colon. */
export function parseOwnerCacheKey(storageKey: string): { ownerId: string; key: string } | null {
  if (!storageKey.startsWith(USER_STATE_PREFIX)) return null;
  const rest = storageKey.slice(USER_STATE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator < 0) return null;

  const ownerId = rest.slice(0, separator);
  const key = rest.slice(separator + 1);
  if (!isOwnerId(ownerId) || !key) return null;
  return { ownerId, key };
}

function isOwnedQueueKey(storageKey: string): boolean {
  return parseOwnerQueueKey(storageKey) !== null;
}

/** The owner of a `wt-us-queue:<ownerId>` key, or null. */
export function parseOwnerQueueKey(storageKey: string): string | null {
  if (!storageKey.startsWith(`${USER_STATE_QUEUE_KEY}:`)) return null;
  const ownerId = storageKey.slice(USER_STATE_QUEUE_KEY.length + 1);
  return isOwnerId(ownerId) ? ownerId : null;
}

/** True for anything written before owner namespacing: the bare cache keys,
 * the bare queue, and the pre-user_state keys the four migrated components
 * used. None of them names an owner, which is exactly why they are only ever
 * adopted against the `wt-us-owner` marker (lib/user-state/legacy.ts). */
export function isLegacyStorageKey(storageKey: string): boolean {
  if (storageKey === USER_STATE_QUEUE_KEY) return true;
  if (storageKey.startsWith(USER_STATE_PREFIX) && !parseOwnerCacheKey(storageKey)) return true;
  return isLegacyComponentStorageKey(storageKey);
}

/** Every un-namespaced key present, in the order they were listed. Used when
 * the marker says the legacy data is someone else's — they go unread. */
export function legacyStorageKeys(all: readonly string[]): string[] {
  return all.filter(isLegacyStorageKey);
}

/** Everything that must leave localStorage when `ownerId` signs out: that
 * account's namespaced entries, every un-namespaced entry (no owner can be
 * proved for one, so it may not outlive the session that could have written
 * it), the owner marker, and any `<base>` / `<base>:<owner>` buffer named in
 * `bufferBases`.
 *
 * `ownerId` null means the signing-out account could not be identified — the
 * sweep then widens to every owner's entries rather than leaving data of an
 * unknown account behind.
 */
export function purgeableStorageKeys(
  all: readonly string[],
  ownerId: string | null,
  bufferBases: readonly string[] = []
): string[] {
  const cachePrefix = ownerId ? ownerCachePrefix(ownerId) : null;
  const queueKey = ownerId ? ownerQueueKey(ownerId) : null;

  return all.filter((storageKey) => {
    if (storageKey === LEGACY_OWNER_MARKER_KEY) return true;
    if (isLegacyStorageKey(storageKey)) return true;

    if (bufferBases.includes(storageKey)) return true;
    for (const base of bufferBases) {
      if (!storageKey.startsWith(`${base}:`)) continue;
      const owner = storageKey.slice(base.length + 1);
      if (!isOwnerId(owner)) continue;
      if (!ownerId || owner === ownerId) return true;
    }

    if (cachePrefix) return storageKey.startsWith(cachePrefix) || storageKey === queueKey;
    // Unknown owner: take every account's namespaced entries too.
    return parseOwnerCacheKey(storageKey) !== null || isOwnedQueueKey(storageKey);
  });
}
