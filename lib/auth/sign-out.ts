import { localeOrDefault, localizedPath } from "@/lib/i18n/localized-path";
import { purgeLocalUserData, purgeServiceWorkerCaches } from "@/lib/auth/purge";
import { createClient } from "@/lib/supabase/client";

export interface SignOutOptions {
  /** The locale the operator is signed out in, straight from useLocale() —
   * /login is a localized route and the navigation leaves the Next.js router
   * behind, so the prefix has to be applied here rather than by
   * @/i18n/routing. Validated, never trusted: anything that is not a known
   * locale falls back to the default. */
  locale: string;
  /** The account signing out, from SessionProvider. Its owner id scopes the
   * storage sweep; when it is unknown the sweep widens to every account's
   * entries rather than leaving data behind. */
  email: string | null | undefined;
}

/** Shared sign-out flow for every client sign-out button.
 *
 * Operators share office PCs, so signing out is a purge, not a redirect: it
 * has to leave the machine with nothing of this account readable and nothing
 * of it still able to reach the server. In order —
 *
 * 1. uploads stop and the pending write queue is dropped unsent (it was
 *    queued under this JWT; the next operator's must not carry it),
 * 2. this owner's localStorage entries, all of sessionStorage and the
 *    telemetry buffer go, and the in-memory stores reset,
 * 3. the service worker deletes every cache that can hold documents, RSC
 *    payloads or API responses — capped at 1.5 s, so a missing or stuck
 *    worker cannot hold up a sign-out,
 * 4. the Supabase session is revoked,
 * 5. a hard navigation to /login replaces the document, which is what
 *    guarantees no React tree, module-level store or in-flight request
 *    survives into the next session — router.push() would have kept all
 *    three alive.
 */
export async function signOutAndPurge({ locale, email }: SignOutOptions): Promise<void> {
  await purgeLocalUserData({ email, resumeSends: false });
  await purgeServiceWorkerCaches();

  try {
    await createClient().auth.signOut();
  } catch {
    // The local session is cleared either way, and the navigation below is
    // what the operator sees. A server-side revoke that failed is retried by
    // the next sign-in; leaving them on the page would be worse.
  }

  window.location.assign(localizedPath("/login", localeOrDefault(locale)));
}
