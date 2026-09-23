import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGES_PUBLIC_PATH,
  productImageSrc,
  productStorageUrl,
  products,
} from "@/lib/content/products";
import { rowToProduct, productToRow, type ProductRow } from "@/lib/content/db";

const SUPABASE_URL = "https://abcd.supabase.co";
const PUBLIC_PRODUCTS = path.resolve(__dirname, "../../../public/products");

describe("productImageSrc", () => {
  it("prefers the uploaded photo over the legacy file", () => {
    expect(
      productImageSrc({ filename: "truba-ppr.jpg", image_path: "products/truba-ppr/0a1b2c3d.webp" }, SUPABASE_URL)
    ).toBe("https://abcd.supabase.co/storage/v1/object/public/product-images/products/truba-ppr/0a1b2c3d.webp");
  });

  it("falls back to the legacy /products file", () => {
    expect(productImageSrc({ filename: "truba-ppr.jpg" }, SUPABASE_URL)).toBe("/products/truba-ppr.jpg");
  });

  it("is null for a product with neither, so the catalog shows its placeholder", () => {
    expect(productImageSrc({}, SUPABASE_URL)).toBeNull();
    expect(productImageSrc({ filename: "", image_path: "" }, SUPABASE_URL)).toBeNull();
  });

  it("tolerates a trailing slash on the project URL", () => {
    expect(productStorageUrl("products/a/0a1b2c3d.png", `${SUPABASE_URL}/`)).toBe(
      `${SUPABASE_URL}${PRODUCT_IMAGES_PUBLIC_PATH}products/a/0a1b2c3d.png`
    );
  });

  it("encodes each key segment but keeps the slashes", () => {
    expect(productStorageUrl("products/a b/0a1b2c3d.png", SUPABASE_URL)).toBe(
      `${SUPABASE_URL}${PRODUCT_IMAGES_PUBLIC_PATH}products/a%20b/0a1b2c3d.png`
    );
  });
});

describe("the 28 legacy catalog photos", () => {
  it("are all still in public/products and still resolve to /products/<filename>", () => {
    expect(products).toHaveLength(28);
    for (const product of products) {
      const src = productImageSrc(product, SUPABASE_URL);
      expect(src, product.id).toBe(`/products/${product.filename}`);
      expect(existsSync(path.join(PUBLIC_PRODUCTS, product.filename ?? "")), product.id).toBe(true);
    }
  });

  it("are exactly the image files in public/products — none orphaned, none missing", () => {
    const files = readdirSync(PUBLIC_PRODUCTS).filter((name) => name !== "manifest.json");
    expect(files.sort()).toEqual(products.map((product) => product.filename).sort());
  });

  it("round-trip through a database row without gaining an image_path", () => {
    for (const product of products) {
      const row = productToRow(product);
      expect(Object.keys(row)).not.toContain("image_path");
      const stored: ProductRow = {
        ...row,
        image_path: null,
        status: "published",
        sort_order: 0,
        version: 1,
        created_at: "2026-09-23T00:00:00Z",
        updated_at: "2026-09-23T00:00:00Z",
        updated_by: null,
      };
      const back = rowToProduct(stored);
      expect(back.filename).toBe(product.filename);
      expect(back.image_path).toBeUndefined();
    }
  });
});

describe("rowToProduct for an admin-created product", () => {
  it("carries image_path and no filename", () => {
    const row: ProductRow = {
      id: "yangi-kran",
      filename: null,
      image_path: "products/yangi-kran/0a1b2c3d.avif",
      name_ru: "Новый кран",
      name_uz: null,
      sizes: [],
      line: "ppr",
      category: "kran",
      material: null,
      status: "published",
      sort_order: 30,
      version: 2,
      created_at: "2026-09-23T00:00:00Z",
      updated_at: "2026-09-23T00:00:00Z",
      updated_by: "manager@watertech.uz",
    };
    const product = rowToProduct(row);
    expect(product.filename).toBeUndefined();
    expect(productImageSrc(product, SUPABASE_URL)).toBe(
      "https://abcd.supabase.co/storage/v1/object/public/product-images/products/yangi-kran/0a1b2c3d.avif"
    );
  });
});
