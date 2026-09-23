/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { isPurgeRequest, USER_CACHES_PURGED, type UserCachesPurgedMessage } from "@/lib/pwa/sw-messages";
import {
  isNetworkOnlyApi,
  isNeverCached,
  isNextStaticAsset,
  isOptimizedProductImage,
  isProductImagePath,
  isPurgeableCacheName,
  isSalesProcessPath,
  isSearchIndex,
  isStorageProductImagePath,
} from "@/lib/pwa/sw-routes";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected at build time by @serwist/next's webpack plugin.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY_SECONDS = 24 * 60 * 60;
const THIRTY_DAYS_SECONDS = 30 * DAY_SECONDS;

// Order matters: Serwist uses the first matching rule, so the exclusions come
// first and the Next.js defaults last.
const runtimeCaching: RuntimeCaching[] = [
  {
    // NetworkOnly writes nothing to any cache. Serwist only routes GET by
    // default, so the POST to /api/events never reaches a strategy at all —
    // this keeps its GET-shaped siblings (and auth/login/admin/dashboard
    // documents plus their RSC payloads) out of the cache as well.
    matcher: ({ sameOrigin, url }) => sameOrigin && isNeverCached(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    // Scripts are what an operator is most likely to need mid-call with a
    // flaky connection: try the network briefly, then serve the last copy.
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin && request.mode === "navigate" && isSalesProcessPath(url.pathname),
    handler: new NetworkFirst({
      cacheName: "sales-process-pages",
      networkTimeoutSeconds: 3,
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: THIRTY_DAYS_SECONDS })],
    }),
  },
  {
    // One entry per locale (the ?locale= param is part of the cache key).
    matcher: ({ sameOrigin, url }) => sameOrigin && isSearchIndex(url.pathname),
    handler: new StaleWhileRevalidate({
      cacheName: "search-index",
      plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * DAY_SECONDS })],
    }),
  },
  {
    // Everything else under /api/ is session-bound: it goes to the network
    // every time, so nothing of one operator's is left for the next. Ahead of
    // defaultCache, whose own /api/ rule would cache these in "apis".
    matcher: ({ sameOrigin, url }) => sameOrigin && isNetworkOnlyApi(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    // Build output is content-hashed, so it can be served from cache without
    // revalidating — a new build simply requests new filenames.
    matcher: ({ sameOrigin, url }) => sameOrigin && isNextStaticAsset(url.pathname),
    handler: new CacheFirst({
      cacheName: "next-static-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: THIRTY_DAYS_SECONDS })],
    }),
  },
  {
    // Catalog images: legacy files from /public, uploaded photos from the
    // product-images Storage bucket, and either one via the Next image
    // optimizer. The same-origin predicates exclude the /products app routes
    // themselves, whose HTML must not be served CacheFirst. A photo loaded
    // straight from Storage is cross-origin; it lands here rather than in the
    // defaultCache "cross-origin" cache that a sign-out purges — it is public
    // and content-addressed, like the rest of this cache. (CacheFirst stores
    // only 200 responses, so an opaque no-cors response is not kept.)
    matcher: ({ sameOrigin, url }) =>
      sameOrigin
        ? isOptimizedProductImage(url) || isProductImagePath(url.pathname)
        : isStorageProductImagePath(url.pathname),
    handler: new CacheFirst({
      cacheName: "product-images",
      plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: THIRTY_DAYS_SECONDS })],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  // /offline is added to the precache manifest by next.config.js's
  // additionalPrecacheEntries — `fallbacks` requires it to be precached.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

/** Deletes every runtime cache that can hold a document, an RSC payload or an
 * API response (lib/pwa/sw-routes.ts lists them by name). Signing out must
 * leave the browser with nothing of the knowledge base readable offline
 * without a session; the precache, the build assets and the catalog images
 * are public and identical for every operator, so they stay. */
async function purgeUserCaches(): Promise<string[]> {
  const names = (await caches.keys()).filter(isPurgeableCacheName);
  const deleted = await Promise.all(names.map((name) => caches.delete(name)));
  return names.filter((_, index) => deleted[index]);
}

/** Answers on the port the page opened, falling back to the client itself so
 * a caller that sent no port is not left waiting for its timeout. */
function ack(event: ExtendableMessageEvent, message: UserCachesPurgedMessage) {
  const port = event.ports[0];
  if (port) {
    port.postMessage(message);
    return;
  }
  const source = event.source;
  if (source && "postMessage" in source) (source as Client).postMessage(message);
}

self.addEventListener("message", (event) => {
  if (!isPurgeRequest(event.data)) return;
  event.waitUntil(
    purgeUserCaches().then(
      (deleted) => ack(event, { type: USER_CACHES_PURGED, deleted }),
      // The page is signing out either way: report an empty purge rather
      // than leaving it to time out.
      () => ack(event, { type: USER_CACHES_PURGED, deleted: [] })
    )
  );
});
