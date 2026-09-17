import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/server-session";
import { getContentBundle } from "@/lib/content/loader";
import { buildSearchDocs, type SearchDoc } from "@/lib/search";
import { routing, type Locale } from "@/i18n/routing";

// Auth-gated (reads the session cookie), so never statically rendered — and
// the catch-all below must not swallow Next's static-render bailout signal.
export const dynamic = "force-dynamic";

const localeSchema = z.enum(routing.locales).catch(routing.defaultLocale);

// Locale is passed as an argument (not baked into keyParts) so "uz" and "ru"
// land in separate cache entries under the same "content" tag — same
// pattern as lib/content/loader.ts's per-locale getters.
//
// getContentBundle degrades to an empty bundle on a Supabase outage; an empty
// index is thrown here instead of returned so unstable_cache never stores it
// (the palette then falls back to page-title matches and retries next open).
const getCachedSearchDocs = unstable_cache(
  async (locale: Locale): Promise<SearchDoc[]> => {
    const docs = buildSearchDocs(await getContentBundle(locale));
    if (docs.length === 0) throw new Error("search index is empty");
    return docs;
  },
  ["search-index"],
  { tags: ["content"] }
);

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const locale = localeSchema.parse(new URL(request.url).searchParams.get("locale"));

    const docs = await getCachedSearchDocs(locale);
    return NextResponse.json(docs, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("[api/search-index] unexpected error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
