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

  describe("excluded paths are not matched", () => {
    const excluded = [
      "/products/truba-ppr.jpg",
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
