// Source of truth for the CSP directive string. next.config.js is CommonJS and
// runs before the Next.js TS pipeline, so it cannot `require` this module —
// keep the same directive list duplicated there and update both together
// (tests/unit/security/csp-parity.test.ts enforces it).
export function buildCsp(opts: { supabaseUrl: string; isDev: boolean }): string {
  const { supabaseUrl, isDev } = opts;
  const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");
  // Uploaded catalog photos (0018): only the public object path of the
  // product-images bucket, not the whole Supabase origin. The catalog reaches
  // them through the same-origin image optimizer; this covers any direct load.
  // Spelled out rather than imported from lib/content/products.ts
  // (PRODUCT_IMAGES_PUBLIC_PATH) to keep this module dependency-free — the
  // parity test checks the two agree.
  const productImages = supabaseUrl
    ? ` ${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/product-images/`
    : "";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${productImages}`,
    "font-src 'self'",
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
