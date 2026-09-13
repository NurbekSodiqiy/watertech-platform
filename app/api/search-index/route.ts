import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getServerSession } from "@/lib/auth/server-session";
import { getContentBundle } from "@/lib/content/loader";
import { buildSearchDocs, type SearchDoc } from "@/lib/search";

const getCachedSearchDocs = unstable_cache(
  async (): Promise<SearchDoc[]> => buildSearchDocs(await getContentBundle()),
  ["search-index"],
  { tags: ["content"] }
);

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const docs = await getCachedSearchDocs();
  return NextResponse.json(docs, { headers: { "Cache-Control": "private, max-age=300" } });
}
