// Duplicates the `config.matcher` literal from middleware.ts for
// programmatic use (tests, tooling). Next.js statically analyses that
// literal, so it must stay a string literal there and cannot import this
// module — keep both in sync;
// tests/unit/security/middleware-matcher-parity.test.ts enforces it.
export const MIDDLEWARE_MATCHER =
  "/((?!api/|auth/callback|monitoring(?:/|$)|_next/static|_next/image|favicon\\.ico$|sw\\.js$|manifest\\.webmanifest$|(?:certificates|icons|products)/[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json|webmanifest|map)$).*)";

// Next wraps every matcher source with an optional `/_next/data/...` prefix
// and an optional `.json` suffix (see next/dist/build/analysis/get-page-static-info.js,
// getMiddlewareMatchers) before compiling it to a regexp. Neither addition
// changes whether a plain pathname (no basePath, no built-in `i18n` config —
// this project routes locales via next-intl, not Next's `i18n` option)
// matches, so anchoring the literal itself against the full pathname
// reproduces Next's compiled behavior for the paths this test suite cares
// about.
const middlewareMatcherRegex = new RegExp(`^${MIDDLEWARE_MATCHER}$`);

export function matchesMiddleware(pathname: string): boolean {
  return middlewareMatcherRegex.test(pathname);
}
