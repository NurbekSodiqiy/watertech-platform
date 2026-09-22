/**
 * Pure URL predicates behind the service worker's runtime caching rules
 * (app/sw.ts). They live here, apart from the worker, so they can be unit
 * tested — "this response must never be cached" is a security property, not
 * a preference, and it is not something to verify by reading a matcher.
 */

// `ru` is the only prefixed locale (i18n/routing.ts uses localePrefix
// "as-needed" with `uz` as the default), so every in-app path can arrive
// either bare or under /ru. The lookahead keeps /ruby from losing its head.
const RU_PREFIX = /^\/ru(?=\/|$)/;

/** The locale-independent form of a pathname, e.g. /ru/products -> /products. */
export function appPath(pathname: string): string {
  return pathname.replace(RU_PREFIX, "") || "/";
}

// Anything session-bound or telemetry-related: responses must never be
// written to a cache, or one operator's data could be replayed to another on
// a shared machine, and queued events would be served back as "sent".
const NEVER_CACHED_PREFIXES = ["/api/events", "/api/copilot", "/auth", "/login", "/admin", "/dashboard"];

export function isNeverCached(pathname: string): boolean {
  const path = appPath(pathname);
  return NEVER_CACHED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Pages under the sales-process section — the content an operator is most
 * likely to need mid-call on a flaky connection. The section landing page
 * itself is deliberately not included. */
export function isSalesProcessPath(pathname: string): boolean {
  return appPath(pathname).startsWith("/sales-process/");
}

const IMAGE_EXTENSION = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;

/** A catalog image requested straight from /public. Matching on the file
 * extension rather than `request.destination` keeps this true however the
 * request was issued (an <img>, a prefetch, a bare fetch) while still never
 * matching /products or /products/comparisons — app routes carry no
 * extension, and their HTML must not be served cache-first. */
export function isProductImagePath(pathname: string): boolean {
  return pathname.startsWith("/products/") && IMAGE_EXTENSION.test(pathname);
}

/** True for `/_next/image?url=%2Fproducts%2F…`, i.e. a catalog image that went
 * through the Next image optimizer — which is what <Image src="/products/…">
 * actually emits, and therefore what the catalog page really requests. */
export function isOptimizedProductImage(url: URL): boolean {
  if (url.pathname !== "/_next/image") return false;
  const source = url.searchParams.get("url");
  return !!source && source.startsWith("/products/");
}

/** The search index is safe to serve stale and revalidate in the background;
 * it's per-locale, and the ?locale= param is part of the cache key. */
export function isSearchIndex(pathname: string): boolean {
  return pathname === "/api/search-index";
}

export function isNextStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next/static/");
}

/** Same-origin API responses that must reach the network every time. A
 * cached copy of one is a copy of one operator's data, served back to
 * whoever uses the browser next — /api/search-index is the single exception,
 * being public per-locale content that is identical for every account.
 *
 * This takes precedence over Serwist's own defaultCache rule, which would
 * otherwise put every same-origin GET under /api/ into the "apis" cache. */
export function isNetworkOnlyApi(pathname: string): boolean {
  return pathname.startsWith("/api/") && !isSearchIndex(pathname);
}

/* -------------------------------------------------------------------------
 * Cache names
 *
 * Signing out has to leave the browser with nothing readable of the account
 * that just left, which means naming every runtime cache exactly — the
 * worker deletes by an allow-list, never by a pattern, so the precache
 * (whose name carries a build-specific suffix) can never be caught by it.
 * ---------------------------------------------------------------------- */

/** Runtime caches app/sw.ts defines itself and that hold knowledge-base
 * content or session-derived responses. */
const APP_PURGED_CACHES = ["sales-process-pages", "search-index"] as const;

/** Serwist defaultCache names that can hold a document, an RSC payload or an
 * API response — everything an operator could read back without a session:
 *
 * - `pages`, `pages-rsc`, `pages-rsc-prefetch` — HTML and RSC payloads of
 *   every app route the operator visited or prefetched;
 * - `apis` — same-origin GETs under /api/ cached by older builds, before
 *   `isNetworkOnlyApi` took that route away from it;
 * - `cross-origin` — every non-same-origin GET, which includes the Supabase
 *   REST reads that carry this operator's own `user_state` rows;
 * - `others` — the same-origin catch-all, documents included;
 * - `next-data`, `static-data-assets` — JSON/XML/CSV responses, which is
 *   what content data arrives as.
 */
const SERWIST_PURGED_CACHES = [
  "apis",
  "cross-origin",
  "next-data",
  "others",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "static-data-assets",
] as const;

/** Every cache a sign-out deletes. */
export const PURGED_CACHE_NAMES: readonly string[] = [...APP_PURGED_CACHES, ...SERWIST_PURGED_CACHES];

/** Build output and catalog images: content-hashed or public, identical for
 * every operator, and expensive to re-download on a slow connection. They
 * survive a sign-out, as does the precache — which is not listed here
 * because its name is generated, and the worker keeps whatever is not on the
 * purge list. */
export const KEPT_CACHE_NAMES: readonly string[] = [
  "next-static-assets",
  "product-images",
  "google-fonts-stylesheets",
  "google-fonts-webfonts",
  "next-image",
  "next-static-js-assets",
  "static-audio-assets",
  "static-font-assets",
  "static-image-assets",
  "static-js-assets",
  "static-style-assets",
  "static-video-assets",
];

/** Exact match only: a cache whose name is not on the purge list stays,
 * which is what keeps `serwist-precache-v2-<scope>` out of reach of a
 * prefix or substring rule. */
export function isPurgeableCacheName(cacheName: string): boolean {
  return PURGED_CACHE_NAMES.includes(cacheName);
}
