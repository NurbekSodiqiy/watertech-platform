import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/auth/server-session";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { OperatorFilter } from "@/components/dashboard/OperatorFilter";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { DashboardWidgetError } from "@/components/dashboard/DashboardWidgetError";
import { PeopleActivityList } from "@/components/admin/people/PeopleActivityList";
import { fetchPeopleLookup } from "@/lib/admin/people-queries";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchActivityTelemetry, fetchDashboardKpis } from "@/lib/dashboard/telemetry-window";
import { PLANNED_HOURS } from "@/lib/telemetry/aggregate";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "dashboard.metadata" });
  return { title: t("activity") };
}

const BASE_PATH = "/dashboard";

export default async function DashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);
  const [t, tDash, tPlan, tHeading, tPeople] = await Promise.all([
    getTranslations("emptyState.dashboardNoEvents"),
    getTranslations("dashboard.activity"),
    getTranslations("dailyTimeline.tasks"),
    getTranslations("dashboard.headings"),
    getTranslations("pages.admin.people.activityList"),
  ]);

  // Access check happens here, in the page itself — role comes from the
  // JWT claim (no DB round trip). Not the admin -> their home, no error shown.
  await requireAdminPage(locale);

  if (process.env.NODE_ENV !== "production") console.time("[dashboard] Faollik render");

  const range = parseDashboardRange(searchParams);
  const [kpis, { operators, hourly, zeroResultSearches, webVitals }, lookup] = await Promise.all([
    fetchDashboardKpis(range),
    fetchActivityTelemetry(range),
    // Who the emails in the activity list are: names, roles and the person page.
    fetchPeopleLookup(),
  ]);
  const people = lookup.ok ? new Map(lookup.data.map((person) => [person.email, person])) : null;

  if (process.env.NODE_ENV !== "production") console.timeEnd("[dashboard] Faollik render");

  return (
    <div className="space-y-6">
      <PageHeader path={BASE_PATH} title={tHeading("activity.title")} description={tHeading("activity.description")} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker range={range} basePath={BASE_PATH} />
        <OperatorFilter range={range} basePath={BASE_PATH} />
      </div>

      {kpis.ok ? <KpiGrid kpis={kpis.data} /> : <DashboardWidgetError />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[15px] font-bold text-primary-dark">{tPeople("title")}</h2>
          <Link href="/admin/users" className="text-[13px] font-medium text-accent hover:underline">
            {tPeople("all")}
          </Link>
        </div>
        {!operators.ok ? (
          <DashboardWidgetError />
        ) : operators.data.length === 0 ? (
          <EmptyState
            variant="inline"
            stateKey="dashboardNoEvents"
            title={t("title")}
            reason={t("reason")}
            action={{ label: t("cta"), href: "/dashboard" }}
          />
        ) : (
          <PeopleActivityList rows={operators.data} people={people} range={range} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-primary-dark">{tDash("hourlyHeading")}</h2>
        {!hourly.ok ? (
          <DashboardWidgetError />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/60">
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("hour")}</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("plan")}</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("actual")}</th>
                </tr>
              </thead>
              <tbody>
                {PLANNED_HOURS.map((block) => {
                  const actual = hourly.data.slice(block.startHour, block.endHour).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={block.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-text-secondary">
                        {block.startHour}:00–{block.endHour}:00
                      </td>
                      <td className="px-4 py-2.5 text-primary-dark">{tPlan(String(block.id))}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex min-w-[32px] justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                            actual > 0 ? "bg-status-ok/15 text-status-ok" : "bg-border/50 text-text-secondary"
                          }`}
                        >
                          {actual}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-primary-dark">{tDash("zeroHeading")}</h2>
        {!zeroResultSearches.ok ? (
          <DashboardWidgetError />
        ) : zeroResultSearches.data.length === 0 ? (
          <EmptyState variant="inline" stateKey="dashboardNoEvents" title={t("title")} reason={t("reason")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[360px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/60">
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("query")}</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("times")}</th>
                </tr>
              </thead>
              <tbody>
                {zeroResultSearches.data.map((s) => (
                  <tr key={s.query} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-primary-dark">{s.query}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-primary-dark">{tDash("webVitals")}</h2>
        {!webVitals.ok ? (
          <DashboardWidgetError />
        ) : webVitals.data.length === 0 ? (
          <EmptyState variant="inline" stateKey="dashboardNoEvents" title={t("title")} reason={t("reason")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[360px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/60">
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("metric")}</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">p50</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">p75</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tDash("samples")}</th>
                </tr>
              </thead>
              <tbody>
                {webVitals.data.map((v) => (
                  <tr key={v.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-primary-dark">{v.name}</td>
                    <td className="px-4 py-2.5 text-primary-dark">{v.p50}</td>
                    <td className="px-4 py-2.5 text-primary-dark">{v.p75}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{v.samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
