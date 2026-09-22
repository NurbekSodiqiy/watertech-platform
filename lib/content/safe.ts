import { getContentBuildEnv } from "@/lib/env";
import { ContentUnavailableError, ContentValidationError } from "@/lib/content/errors";

// The two error classes live in lib/content/errors.ts (a leaf with no imports)
// and are re-exported here so `@/lib/content/safe` stays the one module a
// caller reaches for. See the comment there for why the split exists.
export { ContentUnavailableError, ContentValidationError };

/**
 * How a failed content read behaves. Always explicit at the call site — the
 * right answer depends on what the caller renders, and nothing about the
 * runtime tells us that.
 *
 * - `"page"`: the read feeds a statically prerendered or ISR page. It rethrows,
 *   so `next build` fails loudly instead of shipping an empty knowledge base,
 *   and an outage during background revalidation leaves the last good page in
 *   the Full Route Cache instead of overwriting it with empty sections for an
 *   hour. Used by lib/content/loader.ts's `getX()` getters.
 * - `"degrade"`: the read feeds a Route Handler or a request-time render that
 *   can show less rather than nothing (`/api/search-index`, `/api/content-refs`,
 *   the Copilot retriever, the manager dashboard). Logs and returns `fallback`.
 *   Used by the `getXOrEmpty()` getters.
 */
export type ContentReadMode = "page" | "degrade";

/** CI builds against a placeholder Supabase project, where every read fails by
 * design. `CONTENT_BUILD_MODE=allow-empty` downgrades `"page"` to `"degrade"`
 * for that one case; production and Vercel builds leave it unset and stay
 * strict. Read per call rather than memoised, so a build step that sets the
 * flag after this module was first evaluated is still honoured. */
function allowsEmptyContent(): boolean {
  return getContentBuildEnv().CONTENT_BUILD_MODE === "allow-empty";
}

/** Runs a content read. On failure: rethrows a ContentUnavailableError in
 * `"page"` mode, or logs and returns `fallback` in `"degrade"` mode. The
 * fallback is returned from outside any unstable_cache callback (fn itself
 * still throws), so a failed read is never stored in the Data Cache either
 * way — but only `"page"` also keeps it out of the Full Route Cache. */
export async function safeContent<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  mode: ContentReadMode
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ContentValidationError) throw error;

    const strict = mode === "page" && !allowsEmptyContent();

    // A nested page read (getContentBundle -> getScripts) already logged the
    // cause and named the kind that actually failed — don't relabel it as
    // "bundle", and don't log the same outage twice.
    if (error instanceof ContentUnavailableError) {
      if (strict) throw error;
      return fallback;
    }

    console.error(`[content:${label}]`, error instanceof Error ? error.message : String(error));
    if (strict) throw new ContentUnavailableError(label);
    return fallback;
  }
}
