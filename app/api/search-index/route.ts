import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/server-session";
import { getContentBundle } from "@/lib/content/loader";
import { buildSearchDocs, type SearchDoc } from "@/lib/search";
import { routing, type Locale } from "@/i18n/routing";

const localeSchema = z.enum(routing.locales).catch(routing.defaultLocale);

// Locale is passed as an argument (not baked into keyParts) so "uz" and "ru"
// land in separate cache entries under the same "content" tag — same
// pattern as lib/content/loader.ts's per-locale getters.
const getCachedSearchDocs = unstable_cache(
  async (locale: Locale): Promise<SearchDoc[]> => buildSearchDocs(await getContentBundle(locale)),
  ["search-index"],
  { tags: ["content"] }
);

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const locale = localeSchema.parse(new URL(request.url).searchParams.get("locale"));

  const docs = await getCachedSearchDocs(locale);
  return NextResponse.json(docs, { headers: { "Cache-Control": "private, max-age=300" } });
}
