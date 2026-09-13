// Duplicated from lib/security/csp.ts (kept as the tested source of truth) because
// this file is CommonJS and runs outside the Next.js TS pipeline, so it cannot
// `require` a TS module. Update both together.
function buildCsp(opts) {
  const { supabaseUrl, isDev } = opts;
  const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    staleTimes: { dynamic: 30, static: 300 },
  },
  // No CSP nonce here on purpose: a nonce needs `headers()` in the root layout to
  // read the per-request value, which would force every operator page to render
  // dynamically and defeat static prerendering (CLAUDE.md #4). 'unsafe-inline'
  // for script/style is the accepted trade-off until that constraint changes.
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: buildCsp({ supabaseUrl, isDev }),
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];

    if (!isDev) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/company/onboarding/call-operator",
        destination: "/company/onboarding",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
