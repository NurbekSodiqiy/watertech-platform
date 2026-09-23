import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { actionErrorResult, logDbError, type ActionFailure } from "@/lib/admin/errors";
import { adminErrorMap } from "@/lib/admin/validation";
import { idSchema } from "@/lib/admin/schemas";
import { VersionConflictError } from "@/lib/admin/version-conflict";
import {
  PRODUCT_IMAGE_PATH_PATTERN,
  checkImageFile,
  productImagePath,
  verifyImageBytes,
  type ImageUploadResult,
} from "@/lib/admin/product-image";
import { PRODUCT_IMAGES_BUCKET, productStorageUrl } from "@/lib/content/products";
import type { AdminDbClient } from "@/lib/admin/registry";
import { updateWithVersion } from "./concurrency";
import type { ContentActionDeps } from "./factory";

// The photo upload behind /admin/products/[id]. Not a "use server" file, for
// the same reason factory.ts is not: the body takes its dependencies as an
// argument so tests/unit/admin/product-image-action.test.ts can drive it over
// a mocked fetch; lib/admin/actions/products.ts is the Server Action surface.
//
// Order of operations, and why:
//   1. manager session, then the form fields, then the file's reported type,
//      name and size, then its bytes — a caller who may not upload, or a file
//      that is plainly wrong, is refused before anything is hashed or sent on;
//   2. the row's current version is compared before anything is uploaded, so
//      a stale form does not leave an object behind;
//   3. the object is written under a content-addressed key with the session
//      client — Storage RLS (0018) refuses anyone who is not a manager, even if
//      this code were wrong;
//   4. image_path is written through updateWithVersion, the same optimistic
//      check every content write uses; if that fails, the new object is
//      removed again;
//   5. only then is the previous object removed. A failure there leaves an
//      orphan in Storage, which costs a few hundred kB — never a row pointing
//      at a missing file.

export interface ProductImageDeps extends Pick<ContentActionDeps, "requireSession" | "client" | "revalidate"> {
  /** NEXT_PUBLIC_SUPABASE_URL — turns the stored key into the preview URL. */
  supabaseUrl: string;
}

const TABLE = "content_products";

/** A year: every key is content-addressed (productImagePath), so an object
 * under a given key never changes and can be cached for as long as it lives. */
const OBJECT_CACHE_SECONDS = "31536000";

const uploadFieldsSchema = z.object({
  id: idSchema,
  // FormData carries text; the version the form loaded is at least 1.
  expectedVersion: z.coerce.number().int().positive(),
});

/** A picked file as it arrives in FormData. `File` extends `Blob` and adds the
 * name; checked structurally because not every runtime exposes a global
 * `File` constructor to test against. */
function isNamedBlob(value: FormDataEntryValue | null): value is File {
  return value instanceof Blob && "name" in value && typeof value.name === "string";
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** HTTP status of a Storage failure, when it carries one. */
function storageStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function storageFailure(error: { message: string }): ActionFailure {
  logDbError(`${PRODUCT_IMAGES_BUCKET} upload`, { message: error.message, code: String(storageStatus(error) ?? "") });
  const status = storageStatus(error);
  // RLS refused the write: the session is not (or is no longer) a manager's.
  if (status === 401 || status === 403) return { ok: false, code: "unauthorized" };
  // The bucket's own limits — only reachable if they and PRODUCT_IMAGE_* drift.
  if (status === 413) return { ok: false, code: "validation", field: "file", details: ["imageTooLarge"] };
  if (status === 415) return { ok: false, code: "validation", field: "file", details: ["imageType"] };
  return { ok: false, code: "unknown" };
}

async function removeObject(supabase: AdminDbClient, path: string, scope: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) logDbError(`${PRODUCT_IMAGES_BUCKET} ${scope}`, { message: error.message });
}

/** actionErrorResult narrowed to its failing half, for ImageUploadResult. */
function uploadFailure(error: unknown): ActionFailure {
  const result = actionErrorResult(error);
  return result.ok ? { ok: false, code: "unknown" } : result;
}

export async function uploadProductImageWith(form: FormData, deps: ProductImageDeps): Promise<ImageUploadResult> {
  try {
    const session = await deps.requireSession();

    const fields = uploadFieldsSchema.parse(
      { id: form.get("id"), expectedVersion: form.get("expectedVersion") },
      { errorMap: adminErrorMap }
    );
    const file = form.get("file");
    if (!isNamedBlob(file)) return { ok: false, code: "validation", field: "file", details: ["required"] };

    // Refuse on the reported size before reading the body into memory; the
    // bytes are measured again by verifyImageBytes.
    const precheck = checkImageFile(file);
    if (precheck) return { ok: false, code: "validation", field: "file", details: [precheck] };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const verified = verifyImageBytes(file, bytes);
    if (!verified.ok) return { ok: false, code: "validation", field: "file", details: [verified.issue] };

    const supabase = deps.client();
    const { data: row, error: readError } = await supabase
      .from(TABLE)
      .select("image_path,version")
      .eq("id", fields.id)
      .maybeSingle()
      .overrideTypes<{ image_path: string | null; version: number }, { merge: false }>();
    if (readError) {
      logDbError(`${TABLE} image read`, readError);
      return { ok: false, code: "unknown" };
    }
    if (!row) return { ok: false, code: "not_found" };
    if (row.version !== fields.expectedVersion) return { ok: false, code: "version_conflict" };

    const path = productImagePath(fields.id, sha256Hex(bytes), verified.type);
    const previous = row.image_path;

    // The same bytes as the photo already on the row: nothing to write.
    if (previous === path) {
      return { ok: true, imagePath: path, imageSrc: productStorageUrl(path, deps.supabaseUrl), version: row.version };
    }

    // `upsert: true` so a key left behind by an earlier attempt whose row
    // update failed is simply rewritten — it is the same bytes by construction.
    const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, bytes, {
      contentType: verified.type,
      cacheControl: OBJECT_CACHE_SECONDS,
      upsert: true,
    });
    if (uploadError) return storageFailure(uploadError);

    try {
      await updateWithVersion(
        supabase,
        TABLE,
        fields.id,
        { image_path: path, updated_by: session.email },
        fields.expectedVersion
      );
    } catch (e) {
      await removeObject(supabase, path, "rollback");
      if (e instanceof VersionConflictError) return { ok: false, code: "version_conflict" };
      throw e;
    }

    // The snapshot trigger (0002) sets version = old.version + 1 on every
    // UPDATE, and the update above matched exactly `expectedVersion`.
    const version = fields.expectedVersion + 1;

    // Only an object this action could have written: the key shape is also a
    // check constraint on the column, so this is belt and braces.
    if (previous && PRODUCT_IMAGE_PATH_PATTERN.test(previous) && previous.startsWith(`products/${fields.id}/`)) {
      await removeObject(supabase, previous, "remove previous");
    }

    deps.revalidate("products");
    return { ok: true, imagePath: path, imageSrc: productStorageUrl(path, deps.supabaseUrl), version };
  } catch (e) {
    return uploadFailure(e);
  }
}
