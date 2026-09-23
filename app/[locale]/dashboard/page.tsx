import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { Clock, Copy, ListChecks } from "lucide-react";
import { getServerSession } from "@/lib/auth/server-session";
import { EmptyState } from "@/components/EmptyState";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { OperatorFilter } from "@/components/dashboard/OperatorFilter";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { DashboardWidgetError } from "@/components/dashboard/DashboardWidgetError";
import { formatDuration } from "@/lib/dashboard/format";
import { parseDashboardRange } from "@/lib/dashboard/range";
import { fetchActivityTelemetry, fetchDashboardKpis } from "@/lib/dashboard/telemetry-window";
import { PLANNED_HOURS } from "@/lib/telemetry/aggregate";

const BASE_PATH = "/dashboard";

export default async function DashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);
  const [t, tDash, tDuration, tPlan] = await Promise.all([
    getTranslations("emptyState.dashboardNoEvents"),
    getTranslations("dashboard.activity"),
    getTranslations("dashboard.duration"),
    getTranslations("dailyTimeline.tasks"),
  ]);

  // Access check happens here, in the page itself — role comes from the
  // JWT claim (no DB round trip). Not a manager -> home, no error shown
  // (this route also isn't linked from the sidebar yet).
  const session = await getServerSession();
  if (!session || session.role !== "manager") redirect({ href: "/", locale });

  if (process.env.NODE_ENV !== "production") console.time("[dashboard] Faollik render");

  const range = parseDashboardRange(searchParams);
  const [kpis, { operators, hourly, zeroResultSearches, webVitals }] = await Promise.all([
    fetchDashboardKpis(range),
    fetchActivityTelemetry(range),
  ]);

  if (process.env.NODE_ENV !== "production") console.timeEnd("[dashboard] Faollik render");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker range={range} basePath={BASE_PATH} />
        <OperatorFilter range={range} basePath={BASE_PATH} />
      </div>

      {kpis.ok ? <KpiGrid kpis={kpis.data} /> : <DashboardWidgetError />}

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-primary-dark">{tDash("perOperator")}</h2>
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
          <div className="grid gap-4 sm:grid-cols-2">
            {operators.data.map((op) => (
              <div key={op.email} className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <p className="truncate text-[14px] font-semibold text-primary-dark">{op.email}</p>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-accent">
                    <Clock size={14} />
                    {formatDuration(op.activeMs, tDuration)}
                  </span>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    {tDash("mostViewed")}
                  </p>
                  {op.topViewed.length === 0 ? (
                    <p className="text-[13px] text-text-secondary">{tDash("noData")}</p>
                  ) : (
                    <ul className="space-y-1">
                      {op.topViewed.map((v, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-[13px]">
                          {v.adminHref ? (
                            <Link href={v.adminHref} className="truncate text-primary hover:underline">
                              {v.label}
                            </Link>
                          ) : (
                            <span className="truncate text-primary-dark">{v.label}</span>
                          )}
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {v.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-5 border-t border-border pt-3 text-[13px]">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Copy size={13} />
                    {tDash("copies", { count: op.copyCount })}
                  </span>
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <ListChecks size={13} />
                    {op.checklistPercent !== null
                      ? `${op.checklistCompleted}/${op.checklistTotal} (${op.checklistPercent}%)`
                      : op.checklistCompleted}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
