import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/server-session";
import { getContentBundleOrEmpty, getProductsOrEmpty } from "@/lib/content/loader";
import { buildContentRefs, type ContentRef } from "@/lib/search/refs";
import { routing, type Locale } from "@/i18n/routing";

// Same shape as /api/search-index, which cannot serve this: its docs have no
// script-level or product entries, and pins and recents point at both.
export const dynamic = "force-dynamic";

const localeSchema = z.enum(routing.locales).catch(routing.defaultLocale);

// Reads in "degrade" mode (lib/content/safe.ts): a resolved pin list is a
// convenience, not a page. An empty result is thrown, not returned, so
// unstable_cache never stores the degraded bundle a Supabase outage produces;
// the client then keeps its pins untouched and retries on the next visit.
const getCachedContentRefs = unstable_cache(
  async (locale: Locale): Promise<ContentRef[]> => {
    const [bundle, products] = await Promise.all([getContentBundleOrEmpty(locale), getProductsOrEmpty(locale)]);
    const refs = buildContentRefs(bundle, products);
    if (refs.length === 0) throw new Error("content refs are empty");
    return refs;
  },
  ["content-refs"],
  { tags: ["content"] }
);

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const locale = localeSchema.parse(new URL(request.url).searchParams.get("locale"));

    const refs = await getCachedContentRefs(locale);
    return NextResponse.json(refs, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("[api/content-refs] unexpected error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
