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
