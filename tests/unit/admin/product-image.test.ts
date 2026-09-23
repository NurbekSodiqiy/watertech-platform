import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_PATH_PATTERN,
  PRODUCT_IMAGE_TYPES,
  checkImageFile,
  fileExtension,
  isProductImageType,
  productImagePath,
  sniffImageType,
  verifyImageBytes,
} from "@/lib/admin/product-image";
import { productFormSchema, productWriteSchema } from "@/lib/admin/schemas";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import {
  AVIF_BYTES as AVIF,
  AVIF_COMPATIBLE_BYTES as AVIF_COMPATIBLE,
  GIF_BYTES as GIF,
  HEIC_BYTES as HEIC,
  HTML_BYTES as HTML,
  JPEG_BYTES as JPEG,
  PNG_BYTES as PNG,
  SVG_BYTES as SVG,
  WEBP_BYTES as WEBP,
} from "@/tests/fixtures/images";

const facts = (name: string, type: string, bytes: Uint8Array) => ({ name, type, size: bytes.length });

describe("sniffImageType", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg"],
    ["PNG", PNG, "image/png"],
    ["WebP", WEBP, "image/webp"],
    ["AVIF (major brand)", AVIF, "image/avif"],
    ["AVIF (compatible brand)", AVIF_COMPATIBLE, "image/avif"],
  ])("recognises %s by its signature", (_label, bytes, type) => {
    expect(sniffImageType(bytes)).toBe(type);
  });

  it.each([
    ["HEIC", HEIC],
    ["GIF", GIF],
    ["HTML", HTML],
    ["SVG", SVG],
    ["empty", new Uint8Array(0)],
    ["a truncated PNG signature", new Uint8Array([0x89, 0x50, 0x4e])],
  ])("refuses %s", (_label, bytes) => {
    expect(sniffImageType(bytes)).toBeNull();
  });
});

describe("checkImageFile (the browser's pre-check)", () => {
  it("accepts every allowed type with each of its extensions", () => {
    for (const [type, { extensions }] of Object.entries(PRODUCT_IMAGE_TYPES)) {
      for (const extension of extensions) {
        expect(checkImageFile({ name: `photo.${extension.toUpperCase()}`, type, size: 1000 }), type).toBeNull();
      }
    }
  });

  it("refuses a type outside the list, however it is named", () => {
    expect(checkImageFile({ name: "logo.svg", type: "image/svg+xml", size: 100 })).toBe("imageType");
    expect(checkImageFile({ name: "anim.gif", type: "image/gif", size: 100 })).toBe("imageType");
    expect(checkImageFile({ name: "photo.jpg", type: "", size: 100 })).toBe("imageType");
    expect(checkImageFile({ name: "page.html", type: "text/html", size: 100 })).toBe("imageType");
  });

  it("refuses an extension that does not belong to the declared type", () => {
    expect(checkImageFile({ name: "photo.png", type: "image/jpeg", size: 100 })).toBe("imageType");
    expect(checkImageFile({ name: "photo.jpg.html", type: "image/jpeg", size: 100 })).toBe("imageType");
    expect(checkImageFile({ name: "photo", type: "image/jpeg", size: 100 })).toBe("imageType");
  });

  it("refuses an empty file and one over 2 MB, and allows exactly 2 MB", () => {
    expect(checkImageFile({ name: "a.jpg", type: "image/jpeg", size: 0 })).toBe("required");
    expect(checkImageFile({ name: "a.jpg", type: "image/jpeg", size: PRODUCT_IMAGE_MAX_BYTES + 1 })).toBe(
      "imageTooLarge"
    );
    expect(checkImageFile({ name: "a.jpg", type: "image/jpeg", size: PRODUCT_IMAGE_MAX_BYTES })).toBeNull();
  });

  it("reads extensions case-insensitively and only from the end", () => {
    expect(fileExtension("PHOTO.JPEG")).toBe("jpeg");
    expect(fileExtension("archive.tar.gz")).toBe("gz");
    expect(fileExtension("no-extension")).toBeNull();
    expect(fileExtension("trailing-dot.")).toBeNull();
  });
});

describe("verifyImageBytes (the server's check)", () => {
  it("returns the verified type when name, declared type and bytes agree", () => {
    expect(verifyImageBytes(facts("a.jpeg", "image/jpeg", JPEG), JPEG)).toEqual({ ok: true, type: "image/jpeg" });
    expect(verifyImageBytes(facts("a.png", "image/png", PNG), PNG)).toEqual({ ok: true, type: "image/png" });
    expect(verifyImageBytes(facts("a.webp", "image/webp", WEBP), WEBP)).toEqual({ ok: true, type: "image/webp" });
    expect(verifyImageBytes(facts("a.avif", "image/avif", AVIF), AVIF)).toEqual({ ok: true, type: "image/avif" });
  });

  it("refuses a PNG renamed and re-declared as a JPEG", () => {
    expect(verifyImageBytes(facts("photo.jpg", "image/jpeg", PNG), PNG)).toEqual({ ok: false, issue: "imageType" });
  });

  it("refuses HTML or SVG smuggled in under an image type and extension", () => {
    expect(verifyImageBytes(facts("x.png", "image/png", HTML), HTML)).toEqual({ ok: false, issue: "imageType" });
    expect(verifyImageBytes(facts("x.webp", "image/webp", SVG), SVG)).toEqual({ ok: false, issue: "imageType" });
  });

  it("refuses a real image whose declared type was edited to another allowed one", () => {
    expect(verifyImageBytes(facts("x.webp", "image/webp", JPEG), JPEG)).toEqual({ ok: false, issue: "imageType" });
    expect(verifyImageBytes(facts("x.avif", "image/avif", HEIC), HEIC)).toEqual({ ok: false, issue: "imageType" });
  });

  it("measures the bytes, not the size the client reported", () => {
    const big = new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1);
    big.set(JPEG);
    expect(verifyImageBytes({ name: "a.jpg", type: "image/jpeg", size: 10 }, big)).toEqual({
      ok: false,
      issue: "imageTooLarge",
    });
    expect(verifyImageBytes({ name: "a.jpg", type: "image/jpeg", size: 10 }, new Uint8Array(0))).toEqual({
      ok: false,
      issue: "required",
    });
  });
});

describe("productImagePath", () => {
  const HASH = "0123456789abcdef".repeat(4);

  it("builds products/<id>/<sha256-8>.<ext> from the verified type", () => {
    expect(productImagePath("truba-ppr", HASH, "image/jpeg")).toBe("products/truba-ppr/01234567.jpg");
    expect(productImagePath("truba-ppr", HASH, "image/png")).toBe("products/truba-ppr/01234567.png");
    expect(productImagePath("truba-ppr", HASH, "image/webp")).toBe("products/truba-ppr/01234567.webp");
    expect(productImagePath("truba-ppr", HASH, "image/avif")).toBe("products/truba-ppr/01234567.avif");
  });

  it("always matches the key pattern the column check enforces", () => {
    for (const type of Object.keys(PRODUCT_IMAGE_TYPES).filter(isProductImageType)) {
      expect(PRODUCT_IMAGE_PATH_PATTERN.test(productImagePath("kran-sharovoy-2", HASH, type))).toBe(true);
    }
    expect(PRODUCT_IMAGE_PATH_PATTERN.test("products/../secret/01234567.jpg")).toBe(false);
    expect(PRODUCT_IMAGE_PATH_PATTERN.test("products/x/01234567.svg")).toBe(false);
    expect(PRODUCT_IMAGE_PATH_PATTERN.test("other/x/01234567.jpg")).toBe(false);
  });
});

describe("legacy filename on the product write schema", () => {
  const base = {
    id: "new-product",
    name_ru: "Новый продукт",
    sizes: [],
    line: "ppr",
    category: "truba",
    status: "draft",
  };

  it("is optional, and the form's empty input means none", () => {
    expect(productWriteSchema.parse(base).filename).toBeUndefined();
    expect(productFormSchema.parse({ ...base, sizes: "", filename: "" }).filename).toBeUndefined();
    expect(productFormSchema.parse({ ...base, sizes: "", filename: "  " }).filename).toBeUndefined();
  });

  it("keeps a bare image file name", () => {
    expect(productWriteSchema.parse({ ...base, filename: "truba-ppr.jpg" }).filename).toBe("truba-ppr.jpg");
  });

  it.each(["../secret.jpg", "nested/truba.jpg", "truba.html", "https://evil.example/x.jpg", ".hidden.jpg"])(
    "refuses %s",
    (filename) => {
      expect(productWriteSchema.safeParse({ ...base, filename }).success).toBe(false);
    }
  );

  it("never writes image_path from a form — only the upload action does", () => {
    const parsed = productWriteSchema.parse({ ...base, image_path: "products/other-product/01234567.jpg" });
    const row = CONTENT_REGISTRY.content_products.toRow(parsed);
    expect(Object.keys(row)).not.toContain("image_path");
    expect(row.filename).toBeNull();
  });
});

describe("parity with 0018_product_images.sql", () => {
  const migration = readFileSync(
    path.resolve(__dirname, "../../../supabase/migrations/0018_product_images.sql"),
    "utf8"
  );

  it("uses the same size limit as the bucket", () => {
    expect(migration).toContain(`${PRODUCT_IMAGE_MAX_BYTES},`);
  });

  it("allows exactly the same MIME types as the bucket", () => {
    const listed = /allowed_mime_types[\s\S]*?array\[([^\]]+)\]/.exec(migration.split("-- Section 1")[1] ?? "");
    const fromSql = (listed?.[1] ?? "").split(",").map((entry) => entry.trim().replace(/^'|'$/g, ""));
    expect(fromSql.sort()).toEqual(Object.keys(PRODUCT_IMAGE_TYPES).sort());
    expect(PRODUCT_IMAGE_ACCEPT.split(",").sort()).toEqual(fromSql.sort());
  });

  it("checks image_path with the same pattern productImagePath satisfies", () => {
    expect(migration).toContain(String.raw`'^products/[a-z0-9-]+/[0-9a-f]{8}\.(jpg|png|webp|avif)$'`);
    expect(PRODUCT_IMAGE_PATH_PATTERN.source).toBe(String.raw`^products\/[a-z0-9-]+\/[0-9a-f]{8}\.(?:jpg|png|webp|avif)$`);
  });
});
