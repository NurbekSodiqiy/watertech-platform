import "server-only";
import { revalidateTag } from "next/cache";

export type ContentKind = "scripts" | "objections" | "faqs" | "competitors" | "packages" | "products" | "changelog";

/** Clears the cached loader output for one content kind (or everything, with
 * no argument) after a write to its content_* table. Only the shared
 * "content" tag needs clearing for /api/search-index's cache too — it's
 * tagged "content" (see app/api/search-index/route.ts) precisely so a single
 * revalidateTag("content") call here reaches it as well; no separate
 * "search-index" tag exists. */
export function revalidateContent(kind?: ContentKind): void {
  revalidateTag("content");
  if (kind) revalidateTag(`content:${kind}`);
}
