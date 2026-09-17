import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { Clock, Copy, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getContentBundle } from "@/lib/content/loader";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  aggregatePerOperator,
  aggregateZeroResultSearches,
  aggregateHourly,
  aggregateWebVitals,
  buildEntityLabelMaps,
  PLANNED_HOURS,
  TOTAL_ONBOARDING_ITEMS,
  todayInTashkent,
  isValidDateString,
  tashkentDayRangeUTC,
  type TelemetryRow,
} from "@/lib/telemetry/aggregate";

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} daq`;
  return `${h} soat ${m} daq`;
}

export default async function DashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.dashboardNoEvents");
  const supabase = createClient();

  // Access check happens here, in the page itself — role comes from the
  // JWT claim (no DB round trip). Not a manager -> home, no error shown
  // (this route also isn't linked from the sidebar yet).
  const session = await getServerSession();
  if (!session || session.role !== "manager") redirect({ href: "/", locale });

  const rawDate = Array.isArray(searchParams.date) ? searchParams.date[0] : searchParams.date;
  const selectedDate = isValidDateString(rawDate) ? rawDate : todayInTashkent();
  const { startUTC, endUTC } = tashkentDayRangeUTC(selectedDate);

  // Regular session client, not service-role — RLS's "Managers read all
  // events" policy is what allows this to see every operator's rows.
  const { data, error } = await supabase.from("telemetry_events").select("*").gte("ts", startUTC).lt("ts", endUTC);

  const rows = (data ?? []) as TelemetryRow[];
  const labelMaps = buildEntityLabelMaps(await getContentBundle());
  const operators = aggregatePerOperator(rows, TOTAL_ONBOARDING_ITEMS, labelMaps);
  const zeroResultSearches = aggregateZeroResultSearches(rows);
  const hourlyActual = aggregateHourly(rows);
  const webVitals = aggregateWebVitals(rows);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/dashboard"
        title="Rahbariyat monitoring"
        description="Operatorlarning kunlik faolligi — telemetriya asosida."
      />

      <form method="get" className="flex flex-wrap items-center gap-3">
        <label htmlFor="date" className="text-[13px] font-medium text-text-secondary">
          Kun:
        </label>
        <input
          id="date"
          type="date"
          name="date"
          defaultValue={selectedDate}
          max={todayInTashkent()}
          className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          Ko&apos;rsatish
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-status-outdated/40 bg-status-outdated/10 p-4 text-[13px] text-primary-dark">
          Ma&apos;lumotlarni yuklab bo&apos;lmadi: {error.message}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-primary-dark">Operatorlar bo&apos;yicha kunlik faollik</h2>
        {operators.length === 0 ? (
          <EmptyState
            variant="inline"
            stateKey="dashboardNoEvents"
            title={t("title")}
            reason={t("reason")}
            action={{ label: t("cta"), href: "/dashboard" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {operators.map((op) => (
              <div key={op.email} className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <p className="truncate text-[14px] font-semibold text-primary-dark">{op.email}</p>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-accent">
                    <Clock size={14} />
                    {formatDuration(op.activeMs)}
                  </span>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Eng ko&apos;p ko&apos;rilgan
                  </p>
                  {op.topViewed.length === 0 ? (
                    <p className="text-[13px] text-text-secondary">Ma&apos;lumot yo&apos;q</p>
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
                    {op.copyCount} nusxalash
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
        <h2 className="text-[15px] font-bold text-primary-dark">Soatlik reja vs fakt</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-alt/60">
                <th className="px-4 py-2.5 font-semibold text-primary-dark">Soat</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">Reja</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">Fakt (hodisalar soni)</th>
              </tr>
            </thead>
            <tbody>
              {PLANNED_HOURS.map((block) => {
                const actual = hourlyActual.slice(block.startHour, block.endHour).reduce((a, b) => a + b, 0);
                return (
                  <tr key={`${block.startHour}-${block.task}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-secondary">
                      {block.startHour}:00–{block.endHour}:00
                    </td>
                    <td className="px-4 py-2.5 text-primary-dark">{block.task}</td>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-primary-dark">Nol-natijali qidiruvlar</h2>
        {zeroResultSearches.length === 0 ? (
          <EmptyState variant="inline" stateKey="dashboardNoEvents" title={t("title")} reason={t("reason")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[360px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/60">
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">So&apos;rov</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">Necha marta</th>
                </tr>
              </thead>
              <tbody>
                {zeroResultSearches.map((s) => (
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
        <h2 className="text-[15px] font-bold text-primary-dark">Web Vitals (p50 / p75)</h2>
        {webVitals.length === 0 ? (
          <EmptyState variant="inline" stateKey="dashboardNoEvents" title={t("title")} reason={t("reason")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[360px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/60">
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">Metrika</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">p50</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">p75</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">Namunalar</th>
                </tr>
              </thead>
              <tbody>
                {webVitals.map((v) => (
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
