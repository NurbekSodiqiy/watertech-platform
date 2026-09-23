import type { ActionFailure } from "@/lib/admin/errors";

// What a catalog photo upload is allowed to be, in one module the browser and
// the Server Action both import. The browser runs `checkImageFile` before it
// sends anything (instant feedback, no 2 MB round trip); the server runs
// `verifyImageBytes`, which repeats that check and then reads the file's own
// magic bytes — the declared type and the file name are whatever the client
// says, the bytes are what Storage will serve. The bucket in
// 0018_product_images.sql enforces the same size and type list a third time;
// tests/unit/admin/product-image.test.ts keeps the two in step.

/** 2 MB — `file_size_limit` of the product-images bucket. */
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Allowed types, the extension a stored object gets, and the extensions a
 * picked file may carry. SVG is left out on purpose: it is a document that can
 * run script, and the bucket is public. */
export const PRODUCT_IMAGE_TYPES = {
  "image/jpeg": { ext: "jpg", extensions: ["jpg", "jpeg"] },
  "image/png": { ext: "png", extensions: ["png"] },
  "image/webp": { ext: "webp", extensions: ["webp"] },
  "image/avif": { ext: "avif", extensions: ["avif"] },
} as const satisfies Record<string, { ext: string; extensions: readonly string[] }>;

export type ProductImageType = keyof typeof PRODUCT_IMAGE_TYPES;

/** `accept` for the file input — the same list, so the picker offers nothing
 * the check below would refuse. */
export const PRODUCT_IMAGE_ACCEPT = Object.keys(PRODUCT_IMAGE_TYPES).join(",");

/** Validation keys (lib/admin/validation.ts) an upload can fail with. */
export type ProductImageIssue = "required" | "imageType" | "imageTooLarge";

/** `products/<product id>/<first 8 hex chars of the sha256>.<ext>` — the
 * content_products_image_path_shape check in 0018 is the same pattern. The
 * hash makes the key content-addressed: a new photo always gets a new key, so
 * the CDN, the image optimizer and the service worker can cache each one
 * forever without ever serving a stale photo under a reused name. */
export const PRODUCT_IMAGE_PATH_PATTERN = /^products\/[a-z0-9-]+\/[0-9a-f]{8}\.(?:jpg|png|webp|avif)$/;

export function isProductImageType(value: string): value is ProductImageType {
  return Object.prototype.hasOwnProperty.call(PRODUCT_IMAGE_TYPES, value);
}

/** Lower-cased extension of a file name, or null when it has none. */
export function fileExtension(name: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(name);
  return match ? match[1].toLowerCase() : null;
}

interface FileFacts {
  name: string;
  type: string;
  size: number;
}

/** What the browser can check without reading the file: something was picked,
 * its declared type is allowed, its extension belongs to that type, and it is
 * not over the limit. */
export function checkImageFile(file: FileFacts): ProductImageIssue | null {
  if (file.size === 0) return "required";
  if (!isProductImageType(file.type)) return "imageType";
  const extension = fileExtension(file.name);
  const allowed: readonly string[] = PRODUCT_IMAGE_TYPES[file.type].extensions;
  if (extension === null || !allowed.includes(extension)) return "imageType";
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return "imageTooLarge";
  return null;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte);
}

const AVIF_BRANDS = new Set(["avif", "avis"]);

/** The ISO-BMFF `ftyp` box of an AVIF file: its major brand, or one of its
 * compatible brands, is `avif` (still image) or `avis` (image sequence). */
function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return false;
  const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  if (AVIF_BRANDS.has(ascii(bytes, 8, 4))) return true;
  // Compatible brands start after the major brand and minor version.
  const end = Math.min(boxSize, bytes.length, 64);
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    if (AVIF_BRANDS.has(ascii(bytes, offset, 4))) return true;
  }
  return false;
}

/** The image type the bytes themselves say, from their leading signature —
 * or null for anything that is not one of the four allowed formats. */
export function sniffImageType(bytes: Uint8Array): ProductImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (isAvif(bytes)) return "image/avif";
  return null;
}

/** The server's check: everything `checkImageFile` does, then the bytes must
 * be the type the file claims to be. A PNG renamed to .jpg, an HTML page sent
 * as `image/png`, a JPEG whose declared type was edited to `image/webp` — all
 * fail here, before anything reaches Storage. Returns the verified type, which
 * is what the object is stored and served as. */
export function verifyImageBytes(
  file: FileFacts,
  bytes: Uint8Array
): { ok: true; type: ProductImageType } | { ok: false; issue: ProductImageIssue } {
  const issue = checkImageFile(file);
  if (issue) return { ok: false, issue };
  // The bytes, not the reported size, are what gets stored.
  if (bytes.length === 0) return { ok: false, issue: "required" };
  if (bytes.length > PRODUCT_IMAGE_MAX_BYTES) return { ok: false, issue: "imageTooLarge" };
  const sniffed = sniffImageType(bytes);
  if (sniffed === null || sniffed !== file.type) return { ok: false, issue: "imageType" };
  return { ok: true, type: sniffed };
}

/** The object key for a verified photo of product `id`. `sha256Hex` is the
 * digest of the exact bytes being stored. */
export function productImagePath(id: string, sha256Hex: string, type: ProductImageType): string {
  return `products/${id}/${sha256Hex.slice(0, 8)}.${PRODUCT_IMAGE_TYPES[type].ext}`;
}

/** What the upload Server Action answers. On success the form needs three
 * things back: the new key (nothing else writes it), the row's new `version`
 * (the upload is a write, so the form's hidden version is stale otherwise and
 * the next save would conflict with the manager's own upload), and the URL to
 * preview. */
export type ImageUploadResult = { ok: true; imagePath: string; imageSrc: string; version: number } | ActionFailure;
