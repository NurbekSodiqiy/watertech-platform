import {
  isPurgeAck,
  PURGE_ACK_TIMEOUT_MS,
  PURGE_USER_CACHES,
  type PurgeUserCachesMessage,
} from "@/lib/pwa/sw-messages";
import { BUFFER_KEY, purgeTelemetryBuffer, stopTelemetryBuffering } from "@/lib/telemetry/client";
import { deriveOwnerId, purgeableStorageKeys } from "@/lib/user-state/owner";
import {
  resetUserStateStore,
  resumeUserStateSends,
  stopUserStateSends,
} from "@/lib/user-state/store";

/**
 * Everything one account leaves behind in a shared browser, removed in one
 * place. Operators sign in on each other's PCs, so this is the boundary
 * between two accounts: after it runs, nothing the previous operator pinned,
 * read, started or queued is readable — and, just as importantly, nothing of
 * theirs can be uploaded under the next operator's JWT.
 *
 * Used twice: by signOutAndPurge (lib/auth/sign-out.ts), which adds the
 * service-worker purge and the navigation, and by SessionProvider, which runs
 * the same thing without the navigation when another tab signs out or signs a
 * different account in.
 */

export interface PurgeOptions {
  /** The signing-out account. Its owner id decides which namespaced entries
   * go; an unknown address widens the sweep to every account's, which is the
   * safe direction to fail in. */
  email: string | null | undefined;
  /** True while the page stays open (an account switch): uploads are
   * re-enabled afterwards and every mounted key re-hydrates under the new
   * session. False on sign-out, where the page is about to be replaced and
   * nothing more may be written. */
  resumeSends: boolean;
}

/** True once a sign-out purge has run here. `supabase.auth.signOut()`
 * broadcasts SIGNED_OUT to every tab including this one, so SessionProvider
 * runs a second purge moments before the navigation — and that one must not
 * lift the send block on a page that is being replaced. */
let signedOutHere = false;

/** Clears both storages of this owner's data. localStorage is swept by key
 * rather than cleared outright — another operator's namespaced entries and
 * their queued offline writes are theirs to keep, and the theme preference
 * (`watertech-theme`) is not account data. sessionStorage is per-tab and
 * holds nothing worth keeping across a sign-out, so it goes whole. */
function clearStorage(ownerId: string | null): void {
  try {
    const all: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null) all.push(key);
    }
    for (const key of purgeableStorageKeys(all, ownerId, [BUFFER_KEY])) localStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode, blocked origin) — there is nothing
    // persisted to remove, and the in-memory state is already gone.
  }

  try {
    sessionStorage.clear();
  } catch {
    // Same.
  }
}

/** Stops every client-side store, drops what they were holding, and clears
 * the storage of the owner that is leaving.
 *
 * Both stores stop first and synchronously, before the owner id is derived:
 * the account is already on its way out, and an upload or an event flush that
 * started during that await would run under whatever session comes next. */
export async function purgeLocalUserData({ email, resumeSends }: PurgeOptions): Promise<void> {
  stopUserStateSends();
  stopTelemetryBuffering();
  if (!resumeSends) signedOutHere = true;

  const ownerId = await deriveOwnerId(email);
  purgeTelemetryBuffer(ownerId);
  clearStorage(ownerId);
  resetUserStateStore();

  if (resumeSends && !signedOutHere) resumeUserStateSends();
}

/** Asks the active service worker to delete every cache that can hold this
 * operator's content, and waits for its ack.
 *
 * Resolves false when there is no worker, when it does not answer within
 * PURGE_ACK_TIMEOUT_MS, or when it answers with something else: a sign-out
 * must never hang on a worker that is missing, stuck, or from a build that
 * predates this message. The caller signs out either way — the worst case is
 * public knowledge-base content still cached, which the next install of the
 * worker replaces.
 */
export function purgeServiceWorkerCaches(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(false);

  const worker = navigator.serviceWorker.controller;
  if (!worker) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.port1.onmessage = null;
      channel.port1.close();
      resolve(ok);
    };

    const timer = setTimeout(() => finish(false), PURGE_ACK_TIMEOUT_MS);
    channel.port1.onmessage = (event: MessageEvent) => finish(isPurgeAck(event.data));

    try {
      const message: PurgeUserCachesMessage = { type: PURGE_USER_CACHES };
      worker.postMessage(message, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}
