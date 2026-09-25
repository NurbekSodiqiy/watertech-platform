import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { AdminOverview, type ContentSectionStatus } from "@/components/admin/AdminOverview";
import { adminNavGroup } from "@/lib/admin/nav";
import { countRowsByStatus, type OverviewTable } from "@/lib/admin/queries";
import { fetchPeopleOverview, fetchTopContent } from "@/lib/admin/people-queries";
import { parseDashboardRange, previousEqualRange, type DashboardRange } from "@/lib/dashboard/range";
import type { WidgetData } from "@/lib/dashboard/telemetry-window";

// In the (overview) route group so the overview has its own loading.tsx: the
// CMS pages keep the generic skeleton of ../loading.tsx. Still /admin.

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.overview" });
  return { title: t("title") };
}

/** The content table behind each section of the nav's content group. */
const TABLE_BY_HREF: Readonly<Record<string, OverviewTable>> = {
  "/admin/scripts": "content_scripts",
  "/admin/objections": "content_objections",
  "/admin/faq": "content_faqs",
  "/admin/competitors": "content_competitors",
  "/admin/packages": "content_packages",
  "/admin/products": "content_products",
  "/admin/changelog": "content_changelog",
  "/admin/contacts": "content_contacts",
  "/admin/sops": "content_sops",
};

/** Row and draft counts per CMS section — counts only (head: true), never
 * rows; scripts carry large JSONB. One widget: any failed count fails it. */
async function fetchContentStatus(): Promise<WidgetData<ContentSectionStatus[]>> {
  const sections = adminNavGroup("content").items.flatMap((item) => {
    const table = TABLE_BY_HREF[item.href];
    return table ? [{ item, table }] : [];
  });
  try {
    const counts = await Promise.all(sections.map(({ table }) => countRowsByStatus(table)));
    return {
      ok: true,
      data: sections.map(({ item }, index) => ({ item, counts: counts[index] ?? { total: 0, draft: 0 } })),
    };
  } catch (error) {
    console.error("[admin] content status counts failed:", error instanceof Error ? error.message : String(error));
    return { ok: false };
  }
}

/** The admin panel's landing page (R3/S03). Every number comes from the 0021
 * people functions through the admin's own session (lib/admin/people-queries.ts)
 * and the CMS counts; the reads run in parallel. The admin layout has already
 * refused anyone but the admin. */
export default async function AdminOverviewPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);

  // No per-person filter here: an ?op= left over from a dashboard tab is dropped.
  const range: DashboardRange = { ...parseDashboardRange(searchParams), operatorEmail: null };

  const [current, previous, topContent, contentStatus] = await Promise.all([
    fetchPeopleOverview(range),
    fetchPeopleOverview(previousEqualRange(range)),
    fetchTopContent(range),
    fetchContentStatus(),
  ]);

  return (
    <AdminOverview
      locale={locale}
      range={range}
      renderedAt={new Date().toISOString()}
      current={current}
      previous={previous}
      topContent={topContent}
      contentStatus={contentStatus}
    />
  );
}
