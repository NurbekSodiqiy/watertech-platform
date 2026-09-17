import { describe, expect, it } from "vitest";
import {
  appPath,
  isNeverCached,
  isNextStaticAsset,
  isOptimizedProductImage,
  isProductImagePath,
  isSalesProcessPath,
  isSearchIndex,
} from "@/lib/pwa/sw-routes";

describe("appPath", () => {
  it("strips the ru locale prefix", () => {
    expect(appPath("/ru/products")).toBe("/products");
    expect(appPath("/ru")).toBe("/");
  });

  it("leaves default-locale and lookalike paths alone", () => {
    expect(appPath("/products")).toBe("/products");
    // /ruby must not become /by
    expect(appPath("/ruby")).toBe("/ruby");
    expect(appPath("/russia-report")).toBe("/russia-report");
  });
});

describe("isNeverCached", () => {
  it.each([
    "/api/events",
    "/api/copilot",
    "/auth",
    "/auth/callback",
    "/login",
    "/admin",
    "/admin/products",
    "/admin/versions/scripts/1",
    "/dashboard",
    "/dashboard/anything",
  ])("excludes %s", (path) => {
    expect(isNeverCached(path)).toBe(true);
  });

  it("excludes the ru-prefixed forms of locale-aware areas", () => {
    expect(isNeverCached("/ru/login")).toBe(true);
    expect(isNeverCached("/ru/admin/products")).toBe(true);
    expect(isNeverCached("/ru/dashboard")).toBe(true);
  });

  it("does not exclude cacheable content", () => {
    expect(isNeverCached("/")).toBe(false);
    expect(isNeverCached("/products")).toBe(false);
    expect(isNeverCached("/sales-process/scripts")).toBe(false);
    expect(isNeverCached("/api/search-index")).toBe(false);
    expect(isNeverCached("/offline")).toBe(false);
  });

  it("matches on path segments, not bare string prefixes", () => {
    // /logistics starts with neither /login nor /log… as a segment
    expect(isNeverCached("/logistics")).toBe(false);
    expect(isNeverCached("/logistics/returns-policy")).toBe(false);
    expect(isNeverCached("/administration-guide")).toBe(false);
    expect(isNeverCached("/dashboards-explained")).toBe(false);
  });
});

describe("isSalesProcessPath", () => {
  it("covers pages under the section in both locales", () => {
    expect(isSalesProcessPath("/sales-process/scripts")).toBe(true);
    expect(isSalesProcessPath("/sales-process/objections")).toBe(true);
    expect(isSalesProcessPath("/ru/sales-process/scripts")).toBe(true);
  });

  it("does not cover the section landing page or unrelated routes", () => {
    expect(isSalesProcessPath("/sales-process")).toBe(false);
    expect(isSalesProcessPath("/products")).toBe(false);
  });
});

describe("product images", () => {
  it("recognises images served straight from /public", () => {
    expect(isProductImagePath("/products/filter-01.jpg")).toBe(true);
    expect(isProductImagePath("/products/filter-01.PNG")).toBe(true);
    expect(isProductImagePath("/products/nested/filter.webp")).toBe(true);
  });

  it("never matches the catalog routes that share the prefix", () => {
    expect(isProductImagePath("/products")).toBe(false);
    expect(isProductImagePath("/products/comparisons")).toBe(false);
    expect(isProductImagePath("/products/technical-docs")).toBe(false);
    expect(isProductImagePath("/productsphere")).toBe(false);
  });

  it("recognises optimizer URLs pointing at the catalog", () => {
    const optimized = new URL("http://localhost/_next/image?url=%2Fproducts%2Ffilter-01.jpg&w=640&q=75");
    expect(isOptimizedProductImage(optimized)).toBe(true);
  });

  it("ignores optimizer URLs for other sources", () => {
    const certificate = new URL("http://localhost/_next/image?url=%2Fcertificates%2Fiso.png&w=640&q=75");
    expect(isOptimizedProductImage(certificate)).toBe(false);
    expect(isOptimizedProductImage(new URL("http://localhost/_next/image"))).toBe(false);
    expect(isOptimizedProductImage(new URL("http://localhost/products/filter-01.jpg"))).toBe(false);
  });
});

describe("other rules", () => {
  it("matches the search index endpoint exactly", () => {
    expect(isSearchIndex("/api/search-index")).toBe(true);
    expect(isSearchIndex("/api/search-index/extra")).toBe(false);
    expect(isSearchIndex("/api/events")).toBe(false);
  });

  it("matches hashed build output", () => {
    expect(isNextStaticAsset("/_next/static/chunks/main.js")).toBe(true);
    expect(isNextStaticAsset("/_next/image")).toBe(false);
  });
});
