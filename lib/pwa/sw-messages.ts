/**
 * The message contract between a page and the service worker. Both sides
 * import these names, so a rename can never leave the page waiting on an ack
 * the worker no longer sends.
 */

/** Sent by lib/auth/purge.ts on sign-out: delete every runtime cache that can
 * hold this operator's content (lib/pwa/sw-routes.ts names them). */
export const PURGE_USER_CACHES = "PURGE_USER_CACHES";

/** The worker's answer once the deletions have settled. */
export const USER_CACHES_PURGED = "USER_CACHES_PURGED";

/** How long a sign-out waits for that answer. A worker can be missing,
 * stuck, or from a build that predates this message — sign-out must finish
 * regardless, so the wait is capped and its result only reported, never
 * required. */
export const PURGE_ACK_TIMEOUT_MS = 1500;

export interface PurgeUserCachesMessage {
  type: typeof PURGE_USER_CACHES;
}

export interface UserCachesPurgedMessage {
  type: typeof USER_CACHES_PURGED;
  /** Names actually deleted, for the ack to carry something verifiable. */
  deleted: string[];
}

/** Narrows whatever arrives on a message port; anything else is ignored. */
export function isPurgeAck(data: unknown): data is UserCachesPurgedMessage {
  return !!data && typeof data === "object" && (data as { type?: unknown }).type === USER_CACHES_PURGED;
}

export function isPurgeRequest(data: unknown): data is PurgeUserCachesMessage {
  return !!data && typeof data === "object" && (data as { type?: unknown }).type === PURGE_USER_CACHES;
}
