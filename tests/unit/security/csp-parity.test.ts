import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/security/csp";
import { PRODUCT_IMAGES_PUBLIC_PATH } from "@/lib/content/products";

type BuildCsp = typeof buildCsp;

function isBuildCsp(value: unknown): value is BuildCsp {
  return typeof value === "function";
}

// next.config.js is CommonJS with its own copy of buildCsp (it can't import
// the TS module). Loading the real config file — not a re-typed copy — is
// what makes this test catch drift between the two.
const require = createRequire(import.meta.url);
const nextConfig: unknown = require(path.resolve(__dirname, "../../../next.config.js"));
const configBuildCsp: unknown =
  typeof nextConfig === "object" && nextConfig !== null ? Reflect.get(nextConfig, "buildCsp") : undefined;
const configRemotePatterns: unknown =
  typeof nextConfig === "object" && nextConfig !== null
    ? Reflect.get(nextConfig, "productImageRemotePatterns")
    : undefined;

function isPatternsBuilder(value: unknown): value is (supabaseUrl: string | undefined) => unknown[] {
  return typeof value === "function";
}

function directive(csp: string, name: string): string[] {
  const found = csp.split("; ").find((part) => part.startsWith(`${name} `));
  return found ? found.split(" ").slice(1) : [];
}

describe("CSP builders", () => {
  it("next.config.js exposes its buildCsp copy", () => {
    expect(isBuildCsp(configBuildCsp)).toBe(true);
  });

  for (const isDev of [true, false]) {
    it(`produce identical output (isDev: ${isDev})`, () => {
      if (!isBuildCsp(configBuildCsp)) throw new Error("next.config.js does not expose buildCsp");
      const opts = { supabaseUrl: "https://abcd.supabase.co", isDev };
      expect(configBuildCsp(opts)).toBe(buildCsp(opts));
    });
  }

  it("produce identical output for a project URL with a trailing slash and for a missing one", () => {
    if (!isBuildCsp(configBuildCsp)) throw new Error("next.config.js does not expose buildCsp");
    for (const supabaseUrl of ["https://abcd.supabase.co/", ""]) {
      const opts = { supabaseUrl, isDev: false };
      expect(configBuildCsp(opts)).toBe(buildCsp(opts));
    }
  });
});

describe("img-src for uploaded product photos", () => {
  it("allows the product-images bucket's public path on the project's host, and nothing broader", () => {
    const sources = directive(buildCsp({ supabaseUrl: "https://abcd.supabase.co", isDev: false }), "img-src");
    expect(sources).toEqual([
      "'self'",
      "data:",
      "blob:",
      `https://abcd.supabase.co${PRODUCT_IMAGES_PUBLIC_PATH}`,
    ]);
  });

  it("adds no Supabase source when the project URL is unset", () => {
    expect(directive(buildCsp({ supabaseUrl: "", isDev: true }), "img-src")).toEqual(["'self'", "data:", "blob:"]);
  });
});

describe("next.config.js images.remotePatterns", () => {
  it("is exposed for this test", () => {
    expect(isPatternsBuilder(configRemotePatterns)).toBe(true);
  });

  it("lets the optimizer fetch only the product-images public path on the project host", () => {
    if (!isPatternsBuilder(configRemotePatterns)) throw new Error("next.config.js does not expose productImageRemotePatterns");
    expect(configRemotePatterns("https://abcd.supabase.co")).toEqual([
      { protocol: "https", hostname: "abcd.supabase.co", port: "", pathname: `${PRODUCT_IMAGES_PUBLIC_PATH}**` },
    ]);
    expect(configRemotePatterns("http://127.0.0.1:54321")).toEqual([
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: `${PRODUCT_IMAGES_PUBLIC_PATH}**` },
    ]);
  });

  it("allows no remote images when the project URL is unset or unparsable", () => {
    if (!isPatternsBuilder(configRemotePatterns)) throw new Error("next.config.js does not expose productImageRemotePatterns");
    expect(configRemotePatterns(undefined)).toEqual([]);
    expect(configRemotePatterns("")).toEqual([]);
    expect(configRemotePatterns("not a url")).toEqual([]);
  });
});
