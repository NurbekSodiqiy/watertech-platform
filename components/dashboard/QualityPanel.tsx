import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { findNode } from "@/lib/site-config";
import {
  resolveContentAdminHref,
  type NotHelpfulGroup,
  type ZeroResultQueryGroup,
  type MostViewedItem,
} from "@/lib/dashboard/quality";

async function NotHelpfulSection({ items }: { items: NotHelpfulGroup[] }) {
  const [t, tQ, tCommon] = await Promise.all([
    getTranslations("emptyState.dashboardNoFeedback"),
    getTranslations("dashboard.quality"),
    getTranslations("common"),
  ]);
  // site-config nodes carry a next-intl "nav" namespace key as `title`
  // (see Breadcrumbs.tsx for the same t(node.title) pattern), not literal
  // text — a path with no matching node (most doc pages aren't in siteTree
  // as a leaf, e.g. nested amocrm guides) falls back to the raw path.
  const tNav = await getTranslations("nav");

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-[15px] font-bold text-primary-dark">{tQ("notHelpful")}</h2>
      {items.length === 0 ? (
        <EmptyState variant="inline" stateKey="dashboardNoFeedback" title={t("title")} reason={t("reason")} />
      ) : (
        <ul>
          {items.map((item) => {
            const node = findNode(item.path);
            const label = node ? tNav(node.title) : item.path;
            const adminHref = resolveContentAdminHref(item.path);
            return (
              <li key={item.path} className="flex items-center justify-between gap-3 border-b border-border px-1 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-primary-dark">{label}</p>
                  <p className="truncate text-[12px] text-text-secondary">{item.path}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-status-outdated/15 px-2 py-0.5 text-[11px] font-semibold text-status-outdated">
                    {item.count}
                  </span>
                  {adminHref && (
                    <Link
                      href={adminHref}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                    >
                      {tCommon("edit")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

async function ZeroResultSection({ items }: { items: ZeroResultQueryGroup[] }) {
  const [t, tQ] = await Promise.all([getTranslations("emptyState.dashboardNoEvents"), getTranslations("dashboard.quality")]);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-[15px] font-bold text-primary-dark">{tQ("zeroHeading")}</h2>
      {items.length === 0 ? (
        <EmptyState variant="inline" stateKey="dashboardNoEvents" title={t("title")} reason={t("reason")} />
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.query} className="flex items-center justify-between gap-3 border-b border-border px-1 py-2.5 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-primary-dark">{item.query}</p>
                <p className="text-[12px] text-text-secondary">
                  {tQ("lastSeen", { date: new Date(item.lastSeenIso).toLocaleDateString("uz-UZ") })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                  {item.count}
                </span>
                <Link
                  href={`/admin/faq/new?question=${encodeURIComponent(item.query)}`}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                >
                  {tQ("createFaq")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function MostViewedSection({ items }: { items: MostViewedItem[] }) {
  const [t, tQ] = await Promise.all([getTranslations("emptyState.dashboardNoEvents"), getTranslations("dashboard.quality")]);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft lg:col-span-2">
      <h2 className="text-[15px] font-bold text-primary-dark">{tQ("mostViewed")}</h2>
      {items.length === 0 ? (
        <EmptyState variant="inline" stateKey="dashboardNoEvents" title={t("title")} reason={t("reason")} />
      ) : (
        <ol className="grid gap-x-6 sm:grid-cols-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2 border-b border-border px-1 py-2 last:border-0">
              {item.adminHref ? (
                <Link href={item.adminHref} className="truncate text-[13px] text-primary hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-[13px] text-primary-dark">{item.label}</span>
              )}
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export async function QualityPanel({
  notHelpful,
  zeroResultQueries,
  mostViewed,
}: {
  notHelpful: NotHelpfulGroup[];
  zeroResultQueries: ZeroResultQueryGroup[];
  mostViewed: MostViewedItem[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <NotHelpfulSection items={notHelpful} />
      <ZeroResultSection items={zeroResultQueries} />
      <MostViewedSection items={mostViewed} />
    </div>
  );
}
