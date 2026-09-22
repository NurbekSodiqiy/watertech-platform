// Leaf module, deliberately importless: lib/content/schemas.ts needs
// ContentValidationError and is itself imported by the publish gate, the admin
// schemas and the search index. Keeping the error classes here means none of
// those pull in lib/content/safe.ts — and through it lib/env.ts — just to
// declare a zod shape. Both classes are re-exported from lib/content/safe.ts,
// which stays the module a caller imports.

/** Thrown by the dev-only content validation (validateContentBundle). It is the
 * one error safeContent never swallows in either mode — a content typo must
 * still fail loudly in dev/CI; that check never runs in production. */
export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

/** Thrown by a `"page"` content read whose data could not be loaded. Carries
 * the content kind and nothing else: the underlying error (a PostgREST
 * message, a `fetch failed` naming the project URL) is logged server-side and
 * kept out of the message, which Next.js prints into build output and error
 * overlays. */
export class ContentUnavailableError extends Error {
  readonly kind: string;

  constructor(kind: string) {
    super(
      `Content unavailable: "${kind}" could not be read. Refusing to prerender an empty page — ` +
        `check the Supabase connection (the [content:${kind}] log line above has the cause). ` +
        `Set CONTENT_BUILD_MODE=allow-empty to build against a placeholder project (CI only).`
    );
    this.name = "ContentUnavailableError";
    this.kind = kind;
  }
}
