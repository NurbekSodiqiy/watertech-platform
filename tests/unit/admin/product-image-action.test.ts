import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { uploadProductImageWith, type ProductImageDeps } from "@/lib/admin/actions/product-image";
import { AdminActionError } from "@/lib/admin/errors";
import { PRODUCT_IMAGE_MAX_BYTES } from "@/lib/admin/product-image";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import { HTML_BYTES, JPEG_BYTES, PNG_BYTES, WEBP_BYTES } from "@/tests/fixtures/images";

// Same approach as factory.test.ts: the supabase-js clients are the real ones
// (PostgREST and Storage) and only the network is mocked, so what is asserted
// is what the action really sends — and, for every refusal, that it sends
// nothing at all.

const SUPABASE_URL = "https://example.supabase.co";
const PRODUCT_ID = "truba-ppr";
const PREVIOUS = "products/truba-ppr/aaaaaaaa.webp";

interface RecordedRequest {
  method: string;
  url: URL;
  headers: Headers;
  json: unknown;
  bytes: Uint8Array | null;
}

interface MockResponse {
  status: number;
  body: unknown;
}

type Responder = (request: RecordedRequest) => MockResponse;

function bodyOf(body: BodyInit | null | undefined): { json: unknown; bytes: Uint8Array | null } {
  if (typeof body === "string") return { json: JSON.parse(body), bytes: null };
  if (body instanceof Uint8Array) return { json: null, bytes: body };
  if (body instanceof ArrayBuffer) return { json: null, bytes: new Uint8Array(body) };
  return { json: null, bytes: null };
}

function mockedClient(respond: Responder) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const request: RecordedRequest = {
      method: init?.method ?? "GET",
      url,
      headers: new Headers(init?.headers),
      ...bodyOf(init?.body),
    };
    requests.push(request);
    const { status, body } = respond(request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
  const supabase = createClient<DynamicTablesDatabase>(SUPABASE_URL, "anon-key-anon-key-anon-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase, requests };
}

const isRowRead = (r: RecordedRequest) => r.method === "GET" && r.url.pathname === "/rest/v1/content_products";
const isRowUpdate = (r: RecordedRequest) => r.method === "PATCH" && r.url.pathname === "/rest/v1/content_products";
const isUpload = (r: RecordedRequest) =>
  r.method === "POST" && r.url.pathname.startsWith("/storage/v1/object/product-images/");
const isRemove = (r: RecordedRequest) => r.method === "DELETE" && r.url.pathname === "/storage/v1/object/product-images";

interface Routes {
  row?: { image_path: string | null; version: number } | null;
  upload?: MockResponse;
  update?: MockResponse;
}

function routes({
  row = { image_path: PREVIOUS, version: 3 },
  upload = { status: 200, body: { Key: "product-images/x", Id: "1" } },
  update = { status: 200, body: [{ id: PRODUCT_ID }] },
}: Routes = {}): Responder {
  return (request) => {
    if (isRowRead(request)) return { status: 200, body: row ? [row] : [] };
    if (isUpload(request)) return upload;
    if (isRowUpdate(request)) return update;
    if (isRemove(request)) return { status: 200, body: [] };
    return { status: 500, body: { message: `unexpected ${request.method} ${request.url.pathname}` } };
  };
}

function testDeps(respond: Responder, session: ProductImageDeps["requireSession"] = async () => ({ email: "manager@watertech.uz" })) {
  const { supabase, requests } = mockedClient(respond);
  const revalidate = vi.fn();
  const deps: ProductImageDeps = {
    requireSession: session,
    client: () => supabase,
    revalidate,
    supabaseUrl: SUPABASE_URL,
  };
  return { deps, requests, revalidate };
}

function form(fields: { id?: string; expectedVersion?: string; file?: File | string | null }): FormData {
  const data = new FormData();
  if (fields.id !== undefined) data.set("id", fields.id);
  if (fields.expectedVersion !== undefined) data.set("expectedVersion", fields.expectedVersion);
  if (fields.file instanceof File) data.set("file", fields.file);
  else if (typeof fields.file === "string") data.set("file", fields.file);
  return data;
}

const file = (bytes: Uint8Array<ArrayBuffer>, name: string, type: string) => new File([bytes], name, { type });

const jpegForm = (expectedVersion = "3") =>
  form({ id: PRODUCT_ID, expectedVersion, file: file(JPEG_BYTES, "Truba.JPG", "image/jpeg") });

const JPEG_KEY = `products/${PRODUCT_ID}/${createHash("sha256").update(JPEG_BYTES).digest("hex").slice(0, 8)}.jpg`;

describe("uploadProductImageWith — refusals that send nothing", () => {
  it("refuses a caller who is not a manager before reading anything", async () => {
    const { deps, requests } = testDeps(routes(), async () => {
      throw new AdminActionError("unauthorized");
    });
    expect(await uploadProductImageWith(jpegForm(), deps)).toEqual({ ok: false, code: "unauthorized" });
    expect(requests).toEqual([]);
  });

  it("refuses a missing or non-file `file` field", async () => {
    const { deps, requests } = testDeps(routes());
    expect(await uploadProductImageWith(form({ id: PRODUCT_ID, expectedVersion: "3" }), deps)).toEqual({
      ok: false,
      code: "validation",
      field: "file",
      details: ["required"],
    });
    expect(await uploadProductImageWith(form({ id: PRODUCT_ID, expectedVersion: "3", file: "x.jpg" }), deps)).toMatchObject({
      code: "validation",
      field: "file",
    });
    expect(requests).toEqual([]);
  });

  it("refuses an id that is not a slug and a version that is not a positive integer", async () => {
    const { deps, requests } = testDeps(routes());
    const photo = file(JPEG_BYTES, "a.jpg", "image/jpeg");
    expect(await uploadProductImageWith(form({ id: "../other", expectedVersion: "3", file: photo }), deps)).toMatchObject({
      ok: false,
      code: "validation",
      field: "id",
    });
    expect(await uploadProductImageWith(form({ id: PRODUCT_ID, expectedVersion: "", file: photo }), deps)).toMatchObject({
      ok: false,
      code: "validation",
      field: "expectedVersion",
    });
    expect(await uploadProductImageWith(form({ id: PRODUCT_ID, expectedVersion: "1.5", file: photo }), deps)).toMatchObject({
      ok: false,
      code: "validation",
      field: "expectedVersion",
    });
    expect(requests).toEqual([]);
  });

  it("refuses a type outside the list, such as SVG", async () => {
    const { deps, requests } = testDeps(routes());
    const svg = file(HTML_BYTES, "logo.svg", "image/svg+xml");
    expect(await uploadProductImageWith(form({ id: PRODUCT_ID, expectedVersion: "3", file: svg }), deps)).toEqual({
      ok: false,
      code: "validation",
      field: "file",
      details: ["imageType"],
    });
    expect(requests).toEqual([]);
  });

  it("refuses a file over 2 MB", async () => {
    const { deps, requests } = testDeps(routes());
    const big = new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1);
    big.set(JPEG_BYTES);
    const result = await uploadProductImageWith(
      form({ id: PRODUCT_ID, expectedVersion: "3", file: file(big, "big.jpg", "image/jpeg") }),
      deps
    );
    expect(result).toEqual({ ok: false, code: "validation", field: "file", details: ["imageTooLarge"] });
    expect(requests).toEqual([]);
  });

  it.each([
    ["a PNG renamed and re-declared as a JPEG", PNG_BYTES, "photo.jpg", "image/jpeg"],
    ["HTML declared as a PNG", HTML_BYTES, "photo.png", "image/png"],
    ["a JPEG declared as WebP", JPEG_BYTES, "photo.webp", "image/webp"],
    ["a JPEG whose name says PNG", JPEG_BYTES, "photo.png", "image/jpeg"],
    ["a WebP with a double extension", WEBP_BYTES, "photo.webp.html", "image/webp"],
  ])("refuses %s (extension / type spoofing)", async (_label, bytes, name, type) => {
    const { deps, requests } = testDeps(routes());
    const result = await uploadProductImageWith(
      form({ id: PRODUCT_ID, expectedVersion: "3", file: file(bytes, name, type) }),
      deps
    );
    expect(result).toEqual({ ok: false, code: "validation", field: "file", details: ["imageType"] });
    expect(requests).toEqual([]);
  });
});

describe("uploadProductImageWith — the write", () => {
  it("uploads under a content-addressed key, points the row at it, then removes the previous photo", async () => {
    const { deps, requests, revalidate } = testDeps(routes());

    const result = await uploadProductImageWith(jpegForm(), deps);

    expect(result).toEqual({
      ok: true,
      imagePath: JPEG_KEY,
      imageSrc: `${SUPABASE_URL}/storage/v1/object/public/product-images/${JPEG_KEY}`,
      version: 4,
    });
    expect(requests.map((r) => r.method)).toEqual(["GET", "POST", "PATCH", "DELETE"]);

    const upload = requests.find(isUpload);
    expect(upload?.url.pathname).toBe(`/storage/v1/object/product-images/${JPEG_KEY}`);
    // Stored as the verified type (the bytes and the declared type agree, or
    // the upload would have been refused above).
    expect(upload?.headers.get("content-type")).toBe("image/jpeg");
    expect(upload?.headers.get("x-upsert")).toBe("true");
    expect(upload?.headers.get("cache-control")).toBe("max-age=31536000");
    expect(upload?.bytes && Array.from(upload.bytes)).toEqual(Array.from(JPEG_BYTES));

    const update = requests.find(isRowUpdate);
    expect(update?.url.searchParams.get("id")).toBe(`eq.${PRODUCT_ID}`);
    expect(update?.url.searchParams.get("version")).toBe("eq.3");
    expect(update?.json).toEqual({ image_path: JPEG_KEY, updated_by: "manager@watertech.uz" });

    expect(requests.find(isRemove)?.json).toEqual({ prefixes: [PREVIOUS] });
    expect(revalidate).toHaveBeenCalledWith("products");
  });

  it("removes nothing when the row had no photo of its own (a legacy /products file)", async () => {
    const { deps, requests } = testDeps(routes({ row: { image_path: null, version: 3 } }));
    expect(await uploadProductImageWith(jpegForm(), deps)).toMatchObject({ ok: true, version: 4 });
    expect(requests.some(isRemove)).toBe(false);
  });

  it("writes nothing when the bytes are the photo the row already has", async () => {
    const { deps, requests, revalidate } = testDeps(routes({ row: { image_path: JPEG_KEY, version: 3 } }));
    expect(await uploadProductImageWith(jpegForm(), deps)).toEqual({
      ok: true,
      imagePath: JPEG_KEY,
      imageSrc: `${SUPABASE_URL}/storage/v1/object/public/product-images/${JPEG_KEY}`,
      version: 3,
    });
    expect(requests.map((r) => r.method)).toEqual(["GET"]);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("reports not_found for a product that does not exist, before uploading", async () => {
    const { deps, requests } = testDeps(routes({ row: null }));
    expect(await uploadProductImageWith(jpegForm(), deps)).toEqual({ ok: false, code: "not_found" });
    expect(requests.map((r) => r.method)).toEqual(["GET"]);
  });

  it("reports version_conflict for a stale form, before uploading", async () => {
    const { deps, requests } = testDeps(routes({ row: { image_path: PREVIOUS, version: 5 } }));
    expect(await uploadProductImageWith(jpegForm("3"), deps)).toEqual({ ok: false, code: "version_conflict" });
    expect(requests.map((r) => r.method)).toEqual(["GET"]);
  });

  it("removes the new object again when the row moved on between the read and the write", async () => {
    const { deps, requests, revalidate } = testDeps(routes({ update: { status: 200, body: [] } }));

    expect(await uploadProductImageWith(jpegForm(), deps)).toEqual({ ok: false, code: "version_conflict" });

    // The rollback deletes the object just written — never the previous one.
    expect(requests.map((r) => r.method)).toEqual(["GET", "POST", "PATCH", "DELETE"]);
    expect(requests.find(isRemove)?.json).toEqual({ prefixes: [JPEG_KEY] });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("removes the new object and answers unknown when the row write fails outright", async () => {
    const { deps, requests } = testDeps(
      routes({ update: { status: 400, body: { code: "23514", message: "violates check constraint", details: null, hint: null } } })
    );
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await uploadProductImageWith(jpegForm(), deps);

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(requests.find(isRemove)?.json).toEqual({ prefixes: [JPEG_KEY] });
    // The database's words stay on the server.
    expect(JSON.stringify(result)).not.toContain("constraint");
    errors.mockRestore();
  });

  it("maps a Storage RLS refusal to unauthorized and leaves the row alone", async () => {
    const { deps, requests } = testDeps(
      routes({ upload: { status: 403, body: { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" } } })
    );
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await uploadProductImageWith(jpegForm(), deps)).toEqual({ ok: false, code: "unauthorized" });
    expect(requests.some(isRowUpdate)).toBe(false);
    expect(requests.some(isRemove)).toBe(false);
    errors.mockRestore();
  });

  it("maps the bucket's own size and type refusals to the same validation keys", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const tooLarge = testDeps(routes({ upload: { status: 413, body: { statusCode: "413", message: "too large" } } }));
    expect(await uploadProductImageWith(jpegForm(), tooLarge.deps)).toEqual({
      ok: false,
      code: "validation",
      field: "file",
      details: ["imageTooLarge"],
    });
    const badType = testDeps(routes({ upload: { status: 415, body: { statusCode: "415", message: "mime" } } }));
    expect(await uploadProductImageWith(jpegForm(), badType.deps)).toEqual({
      ok: false,
      code: "validation",
      field: "file",
      details: ["imageType"],
    });
    errors.mockRestore();
  });
});
