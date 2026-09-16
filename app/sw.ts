/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  isNeverCached,
  isNextStaticAsset,
  isOptimizedProductImage,
  isProductImagePath,
  isSalesProcessPath,
  isSearchIndex,
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
    // Build output is content-hashed, so it can be served from cache without
    // revalidating — a new build simply requests new filenames.
    matcher: ({ sameOrigin, url }) => sameOrigin && isNextStaticAsset(url.pathname),
    handler: new CacheFirst({
      cacheName: "next-static-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: THIRTY_DAYS_SECONDS })],
    }),
  },
  {
    // Catalog images, both as requested from /public and via the Next image
    // optimizer. Both predicates exclude the /products app routes themselves,
    // whose HTML must not be served CacheFirst.
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && (isOptimizedProductImage(url) || isProductImagePath(url.pathname)),
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
