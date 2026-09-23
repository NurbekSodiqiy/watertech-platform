import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { ActivityFilterForm } from "@/components/admin/ActivityFilterForm";
import { activityFilterParams, parseActivityFilters } from "@/lib/admin/activity";
import { listActivity } from "@/lib/admin/activity-queries";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.activity" });
  return { title: t("title") };
}

function pageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

const PAGER_LINK_CLASS =
  "rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt";

export default async function AdminActivityPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);
  const [t, tEmpty] = await Promise.all([
    getTranslations("pages.admin.activity"),
    getTranslations("emptyState.activityNone"),
  ]);

  const filters = parseActivityFilters(searchParams);
  const { items, page, hasMore, truncated } = await listActivity(filters, pageNumber(searchParams.page));

  function pageHref(target: number): string {
    const params = activityFilterParams(filters);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/admin/activity?${query}` : "/admin/activity";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
      </div>

      <ActivityFilterForm filters={filters} />

      {items.length === 0 ? (
        <EmptyState variant="compact" stateKey="activityNone" title={tEmpty("title")} reason={tEmpty("reason")} />
      ) : (
        <ActivityFeed items={items} />
      )}

      {truncated && <p className="text-[12.5px] text-text-secondary">{t("truncated")}</p>}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={PAGER_LINK_CLASS}>
              {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[12.5px] text-text-secondary">{t("page", { page })}</span>
          {hasMore ? (
            <Link href={pageHref(page + 1)} className={PAGER_LINK_CLASS}>
              {t("older")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
