import { describe, expect, it } from "vitest";
import { matchesMiddleware } from "@/lib/security/middleware-matcher";
import { flattenTree } from "@/lib/site-config";

const sitePaths = flattenTree().map((node) => node.path);

describe("matchesMiddleware", () => {
  describe("site routes are matched (bare and /ru-prefixed)", () => {
    for (const path of sitePaths) {
      it(`matches ${path}`, () => {
        expect(matchesMiddleware(path)).toBe(true);
      });

      it(`matches /ru${path}`, () => {
        expect(matchesMiddleware(`/ru${path}`)).toBe(true);
      });
    }
  });

  // A file extension used to skip middleware on ANY path. Under a dynamic
  // segment that rendered the operator shell to an anonymous visitor, and every
  // one of these (plus the unanchored single-file prefixes) wrote a new ISR
  // cache entry without a session. Each must reach the auth gate now.
  describe("paths that merely end in a file extension are matched", () => {
    const gated = [
      "/sales-process/scripts/lead-orqali-tushgan.json",
      "/uz/sales-process/scripts/lead-orqali-tushgan.txt",
      "/ru/sales-process/battle-cards/alfa-therm.webp",
      "/tools/amocrm/lead-creation.map",
      "/ru/tools/amocrm/lead-creation.png",
      "/admin/scripts/x.json",
      "/admin/versions/content_scripts/x.png",
      "/x.json",
      "/robots.txt",
      "/ru/products/truba-ppr.jpg",
      "/products/comparisons/x.png",
      "/sw.jsx",
      "/sw.js.map",
      "/favicon.ico.json",
      "/faviconXico",
      "/manifest.webmanifest.json",
    ];

    for (const path of gated) {
      it(`matches ${path}`, () => {
        expect(matchesMiddleware(path)).toBe(true);
      });
    }
  });

  describe("excluded paths are not matched", () => {
    const excluded = [
      "/products/truba-ppr.jpg",
      "/products/manifest.json",
      "/certificates/sertifikat-atl-asosiy.png",
      "/favicon.ico",
      "/_next/static/x.js",
      "/_next/image?url=…",
      "/sw.js",
      "/manifest.webmanifest",
      "/icons/icon-192.png",
      "/certificates/x.png",
      "/api/events",
      "/auth/callback",
      "/monitoring",
      "/monitoring/x",
    ];

    for (const path of excluded) {
      it(`does not match ${path}`, () => {
        expect(matchesMiddleware(path)).toBe(false);
      });
    }
  });

  it("matches a path that merely starts with 'monitoring'", () => {
    expect(matchesMiddleware("/monitoring-report")).toBe(true);
  });
});
