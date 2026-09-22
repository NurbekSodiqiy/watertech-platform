import "server-only";
import { unstable_cache } from "next/cache";
import { getContentBundleOrEmpty, getProductsOrEmpty } from "@/lib/content/loader";
import { buildCopilotDocs, createCopilotIndex, type CopilotChunk, type CopilotDoc } from "@/lib/copilot/docs";
import type { Locale } from "@/i18n/routing";

// Same shape as /api/search-index: locale is an argument (separate cache
// entries per locale), tagged "content" so a CMS publish revalidates it, and
// an empty doc set is thrown rather than cached so a Supabase outage isn't
// remembered as "the knowledge base is empty" for the next hour.
const getCopilotDocs = unstable_cache(
  async (locale: Locale): Promise<CopilotDoc[]> => {
    const [bundle, products] = await Promise.all([getContentBundleOrEmpty(locale), getProductsOrEmpty(locale)]);
    const docs = buildCopilotDocs(bundle, products);
    if (docs.length === 0) throw new Error("copilot docs are empty");
    return docs;
  },
  ["copilot-docs"],
  { tags: ["content"], revalidate: 3600 }
);

/** Top-k content chunks for a question, capped at ~6000 chars in total.
 * Returns [] when content can't be loaded — the route then answers "not in
 * the knowledge base" instead of letting the model improvise. */
export async function retrieve(query: string, locale: Locale, k = 8): Promise<CopilotChunk[]> {
  let docs: CopilotDoc[];
  try {
    docs = await getCopilotDocs(locale);
  } catch (error) {
    console.error("[copilot] retrieval docs unavailable:", error);
    return [];
  }
  return createCopilotIndex(docs).search(query, k);
}
