"use server";
import "server-only";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import { actionsFor, liveProductImageDeps } from "./deps";
import type { RemoveOptions } from "./factory";
import { uploadProductImageWith } from "./product-image";
import type { ActionResult } from "@/lib/admin/errors";
import type { ImageUploadResult } from "@/lib/admin/product-image";
import type { StatusValue } from "./status";

// Thin Server Action surface over the shared factory (./factory.ts). The
// bodies these three used to carry — parse, gate, write, revalidate — are the
// same for every content table and live in one place now; what stays here is
// the export names the pages and the DataTable bind to, because a Server
// Action reference must be an exported async function.

const products = actionsFor(CONTENT_REGISTRY.content_products);

export async function upsertProduct(input: unknown): Promise<ActionResult> {
  return products.save(input);
}

export async function deleteProduct(
  id: string,
  expectedVersion: number,
  options?: RemoveOptions
): Promise<ActionResult> {
  return products.remove(id, expectedVersion, options);
}

export async function setProductStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return products.setStatus(id, status, expectedVersion);
}

/** Uploads a catalog photo for an existing product and points its
 * `image_path` at it (see ./product-image.ts). FormData fields: `id`,
 * `expectedVersion`, `file`. */
export async function uploadProductImage(form: FormData): Promise<ImageUploadResult> {
  return uploadProductImageWith(form, liveProductImageDeps);
}
