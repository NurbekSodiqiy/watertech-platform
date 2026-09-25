import { getTranslations } from "next-intl/server";
import {
  BarChart3,
  CalendarDays,
  Clock,
  Copy,
  Eye,
  GraduationCap,
  LayoutGrid,
  Table2,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { DashboardWidgetError } from "@/components/dashboard/DashboardWidgetError";
import { OverviewRefresh } from "@/components/admin/OverviewRefresh";
import { RelativeTime } from "@/components/admin/RelativeTime";
import { BarList } from "@/components/admin/charts/BarList";
import { ChartCard } from "@/components/admin/charts/ChartCard";
import { ColumnBars } from "@/components/admin/charts/ColumnBars";
import { CompareTable, type CompareColumn, type CompareRow } from "@/components/admin/charts/CompareTable";
import { StatCard } from "@/components/admin/charts/StatCard";
import type { AdminNavItem } from "@/lib/admin/nav";
import type { StatusCounts } from "@/lib/admin/queries";
import { personPath, type PersonOverview, type TopContentItem } from "@/lib/admin/people";
import {
  averagePer,
  displayName,
  hasActivity,
  onboardingPercent,
  overviewDeltas,
  overviewPeople,
  overviewTotals,
  rankPeople,
  toMinutes,
} from "@/lib/admin/overview";
import { formatDuration } from "@/lib/dashboard/format";
import type { DashboardRange } from "@/lib/dashboard/range";
import type { WidgetData } from "@/lib/dashboard/telemetry-window";
import { TOTAL_ONBOARDING_ITEMS } from "@/lib/telemetry/aggregate";

/** One CMS section of the content-status grid: its nav entry and its counts. */
export interface ContentSectionStatus {
  item: AdminNavItem;
  counts: StatusCounts;
}

export interface AdminOverviewProps {
  locale: string;
  range: DashboardRange;
  /** When the page's data was read (ISO) — "Yangilandi HH:MM" after mount. */
  renderedAt: string;
  current: WidgetData<PersonOverview[]>;
  /** The equal-length window before `range`, for the StatCards' deltas. */
  previous: WidgetData<PersonOverview[]>;
  topContent: WidgetData<TopContentItem[]>;
  contentStatus: WidgetData<ContentSectionStatus[]>;
}

function intlLocale(locale: string): string {
  return locale === "ru" ? "ru-RU" : "uz-UZ";
}

/** The admin overview's body (/admin, R3/S03), apart from its reads so the
 * page stays a thin fetch-and-render: how operators and sales managers used
 * the knowledge base over a range, next to the content's own state. Every
 * widget fails and empties on its own (CLAUDE.md §15): a failed read renders
 * DashboardWidgetError in that widget's slot, no people or no events an
 * EmptyState — never a silent zero. */
export async function AdminOverview({
  locale,
  range,
  renderedAt,
  current,
  previous,
  topContent,
  contentStatus,
}: AdminOverviewProps) {
  const [t, tNav, tRoles, tDuration, tEmpty] = await Promise.all([
    getTranslations("pages.admin.overview"),
    getTranslations("admin.nav"),
    getTranslations("pages.admin.users.roles"),
    getTranslations("dashboard.duration"),
    getTranslations("pages.admin.overview.empty"),
  ]);

  const numbers = new Intl.NumberFormat(intlLocale(locale));
  const dayFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" });
  const num = (value: number): string => numbers.format(value);
  const duration = (ms: number): string => formatDuration(ms, tDuration);
  const percent = (value: number | null): string => (value === null ? "—" : t("percent", { value }));

  const people = current.ok ? overviewPeople(current.data) : [];
  const active = current.ok && hasActivity(people);

  const noPeople = (
    <EmptyState
      variant="compact"
      stateKey="dashboardNoOperators"
      title={tEmpty("noPeople.title")}
      reason={tEmpty("noPeople.reason")}
      action={{ label: tEmpty("noPeople.cta"), href: "/admin/users" }}
    />
  );
  const noEvents = (
    <EmptyState
      variant="compact"
      stateKey="dashboardNoEvents"
      title={tEmpty("noEvents.title")}
      reason={tEmpty("noEvents.reason")}
    />
  );
  /** The shared empty/error decision of the people widgets. */
  const peopleState = !current.ok ? <DashboardWidgetError /> : people.length === 0 ? noPeople : !active ? noEvents : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
            <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
          </div>
          <OverviewRefresh renderedAt={renderedAt} />
        </div>
        <RangePicker range={range} basePath="/admin" />
      </div>

      {current.ok ? (
        <KpiRow
          people={current.data}
          previous={previous.ok ? previous.data : null}
          t={t}
          num={num}
          duration={duration}
          percent={percent}
        />
      ) : (
        <DashboardWidgetError />
      )}

      <ChartCard icon={Table2} title={t("compare.title")} description={t("compare.description")}>
        {!current.ok ? (
          <DashboardWidgetError />
        ) : people.length === 0 ? (
          noPeople
        ) : (
          <CompareTable
            caption={t("compare.title")}
            columns={compareColumns(t)}
            rows={people.map((person) => compareRow(person, { t, tRoles, num, duration, percent }))}
            defaultSort={{ key: "activeTime", direction: "desc" }}
          />
        )}
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard icon={Timer} title={t("activeTimeChart.title")} description={t("activeTimeChart.description")}>
          {peopleState ?? (
            <BarList
              tone="green"
              label={t("activeTimeChart.title")}
              empty={noEvents}
              rows={rankPeople(people, (person) => person.activeMs).map((person) => ({
                key: person.email,
                label: displayName(person),
                sublabel: t("activeTimeChart.sublabel", { days: person.activeDays }),
                value: person.activeMs,
                display: duration(person.activeMs),
                href: personPath(person.email),
              }))}
            />
          )}
        </ChartCard>
        <ChartCard icon={BarChart3} title={t("usageChart.title")} description={t("usageChart.description")}>
          {peopleState ?? (
            <BarList
              tone="blue"
              label={t("usageChart.title")}
              empty={noEvents}
              rows={rankPeople(people, (person) => person.contentViews + person.copies).map((person) => ({
                key: person.email,
                label: displayName(person),
                sublabel: t("usageChart.sublabel", { views: num(person.contentViews), copies: num(person.copies) }),
                value: person.contentViews + person.copies,
                display: num(person.contentViews + person.copies),
                href: personPath(person.email),
              }))}
            />
          )}
        </ChartCard>
      </div>

      <ChartCard icon={Trophy} title={t("topContent.title")} description={t("topContent.description")}>
        {!topContent.ok ? (
          <DashboardWidgetError />
        ) : topContent.data.length === 0 ? (
          noEvents
        ) : (
          <div
            role="region"
            aria-label={t("topContent.title")}
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <table className="w-full min-w-[36rem] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-[12px] text-text-secondary">
                  <th scope="col" className="w-10 px-3 py-2.5 font-semibold">
                    {t("topContent.columns.rank")}
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">{t("topContent.columns.material")}</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">{t("topContent.columns.type")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("topContent.columns.views")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("topContent.columns.copies")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("topContent.columns.people")}</th>
                </tr>
              </thead>
              <tbody>
                {topContent.data.map((item, index) => (
                  <tr
                    key={`${item.viewType}:${item.entityId ?? item.path}`}
                    className="border-b border-border bg-surface last:border-0"
                  >
                    <td className="px-3 py-2.5 tabular-nums text-text-secondary">{num(index + 1)}</td>
                    <td className="max-w-[22rem] px-3 py-2.5">
                      {item.adminHref ? (
                        <Link
                          href={item.adminHref}
                          className="block truncate rounded-lg font-medium text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="block truncate font-medium text-primary-dark">{item.label}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">
                      {t(`topContent.viewTypes.${item.viewType}`)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-primary-dark">{num(item.views)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-primary-dark">{num(item.copies)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-primary-dark">{num(item.people)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <ChartCard icon={CalendarDays} title={t("daily.title")} description={t("daily.description")}>
        {peopleState ?? (
          <div
            role="region"
            aria-label={t("daily.title")}
            tabIndex={0}
            className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ul className="min-w-max divide-y divide-border">
              {rankPeople(people, (person) => person.activeMs).map((person) => (
                <li
                  key={person.email}
                  className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-end gap-3 py-3 sm:grid-cols-[13rem_minmax(0,1fr)]"
                >
                  <div className="sticky left-0 z-10 min-w-0 self-center bg-surface pr-2">
                    <Link
                      href={personPath(person.email)}
                      className="block truncate rounded-lg text-[13px] font-medium text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {displayName(person)}
                    </Link>
                    {displayName(person) !== person.email && (
                      <p className="truncate text-[12px] text-text-secondary">{person.email}</p>
                    )}
                    <p className="mt-0.5 text-[12px] tabular-nums text-text-secondary">{duration(person.activeMs)}</p>
                  </div>
                  <ColumnBars
                    size="sm"
                    tone="green"
                    scroll={false}
                    label={t("daily.seriesLabel", { name: displayName(person) })}
                    points={person.daily.map((day) => {
                      const minutes = toMinutes(day.activeMs);
                      return {
                        key: day.day,
                        label: String(Number(day.day.slice(8))),
                        value: minutes,
                        display: num(minutes),
                        title: t("daily.pointTitle", {
                          date: dayFormat.format(new Date(`${day.day}T00:00:00.000Z`)),
                          minutes: num(minutes),
                        }),
                      };
                    })}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      <ChartCard icon={LayoutGrid} title={t("contentStatus.title")} description={t("contentStatus.description")}>
        {!contentStatus.ok ? (
          <DashboardWidgetError />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {contentStatus.data.map(({ item, counts }) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex h-full flex-col gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-text-secondary">
                      <Icon size={14} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">{tNav(`items.${item.label}`)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="sr-only">{t("entries", { count: counts.total })}</span>
                      <span aria-hidden="true" className="text-[18px] font-bold leading-none tabular-nums text-primary-dark">
                        {num(counts.total)}
                      </span>
                      {counts.draft > 0 && (
                        <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                          {t("drafts", { count: counts.draft })}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/** The five headline numbers, each against the equal-length window before. */
function KpiRow({
  people,
  previous,
  t,
  num,
  duration,
  percent,
}: {
  people: readonly PersonOverview[];
  previous: readonly PersonOverview[] | null;
  t: Translator;
  num: (value: number) => string;
  duration: (ms: number) => string;
  percent: (value: number | null) => string;
}) {
  const totals = overviewTotals(people, TOTAL_ONBOARDING_ITEMS);
  const deltas = overviewDeltas(totals, previous ? overviewTotals(previous, TOTAL_ONBOARDING_ITEMS) : null);
  const perActive = (average: number | null, format: (value: number) => string): string =>
    average === null ? t("kpi.noActive") : t("kpi.perActive", { value: format(average) });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        icon={Users}
        label={t("kpi.activePeople")}
        value={num(totals.activePeople)}
        caption={t("kpi.activePeopleCaption", { active: num(totals.activePeople), total: num(totals.people) })}
        delta={{ value: deltas.activePeople, unit: "abs" }}
        href="/admin/users"
      />
      <StatCard
        icon={Clock}
        label={t("kpi.activeTime")}
        value={duration(totals.activeMs)}
        caption={perActive(averagePer(totals.activeMs, totals.activePeople), duration)}
        delta={{ value: deltas.activeMs, unit: "%" }}
        href="/dashboard"
      />
      <StatCard
        icon={Eye}
        label={t("kpi.views")}
        value={num(totals.contentViews)}
        caption={perActive(averagePer(totals.contentViews, totals.activePeople), num)}
        delta={{ value: deltas.contentViews, unit: "%" }}
        href="/dashboard/quality"
      />
      <StatCard
        icon={Copy}
        label={t("kpi.copies")}
        value={num(totals.copies)}
        caption={perActive(averagePer(totals.copies, totals.activePeople), num)}
        delta={{ value: deltas.copies, unit: "%" }}
      />
      <StatCard
        icon={GraduationCap}
        label={t("kpi.onboarding")}
        value={percent(totals.onboardingAverage)}
        caption={t("kpi.onboardingCaption")}
        delta={{ value: deltas.onboardingAverage, unit: "pp" }}
        href="/dashboard/quality"
      />
    </div>
  );
}

function compareColumns(t: Translator): CompareColumn[] {
  return [
    { key: "person", header: t("compare.columns.person"), sortable: true, firstDirection: "asc" },
    { key: "activeTime", header: t("compare.columns.activeTime"), align: "right", sortable: true },
    { key: "activeDays", header: t("compare.columns.activeDays"), align: "right", sortable: true },
    { key: "views", header: t("compare.columns.views"), align: "right", sortable: true },
    { key: "copies", header: t("compare.columns.copies"), align: "right", sortable: true },
    { key: "searches", header: t("compare.columns.searches"), align: "right", sortable: true },
    { key: "onboarding", header: t("compare.columns.onboarding"), align: "right", sortable: true },
    { key: "lastSeen", header: t("compare.columns.lastSeen"), align: "right", sortable: true },
  ];
}

function compareRow(
  person: PersonOverview,
  {
    t,
    tRoles,
    num,
    duration,
    percent,
  }: {
    t: Translator;
    tRoles: Translator;
    num: (value: number) => string;
    duration: (ms: number) => string;
    percent: (value: number | null) => string;
  }
): CompareRow {
  const name = displayName(person);
  const onboarding = onboardingPercent(person, TOTAL_ONBOARDING_ITEMS);

  return {
    key: person.email,
    href: personPath(person.email),
    cells: {
      person: {
        sortValue: name,
        content: (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="max-w-full truncate font-semibold text-primary-dark">{name}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  person.role === "manager" ? "bg-primary/10 text-primary" : "bg-surface-alt text-text-secondary"
                }`}
              >
                {tRoles(person.role)}
              </span>
              {!person.isActive && (
                <span className="shrink-0 rounded-full bg-status-outdated/15 px-2 py-0.5 text-[11px] font-semibold text-status-outdated">
                  {t("compare.inactive")}
                </span>
              )}
            </span>
            {name !== person.email && <span className="truncate text-[12px] text-text-secondary">{person.email}</span>}
          </span>
        ),
      },
      activeTime: { sortValue: person.activeMs, content: duration(person.activeMs) },
      activeDays: { sortValue: person.activeDays, content: num(person.activeDays) },
      views: { sortValue: person.contentViews, content: num(person.contentViews) },
      copies: { sortValue: person.copies, content: num(person.copies) },
      searches: {
        sortValue: person.searches,
        content: t("compare.searchesValue", { searches: num(person.searches), zero: num(person.zeroResultSearches) }),
      },
      onboarding: { sortValue: onboarding, content: percent(onboarding) },
      lastSeen: {
        sortValue: person.lastSeenAt ? Date.parse(person.lastSeenAt) : null,
        content: person.lastSeenAt ? (
          <span className="text-text-secondary">
            <RelativeTime iso={person.lastSeenAt} />
          </span>
        ) : (
          <span className="text-text-secondary">{t("compare.never")}</span>
        ),
      },
    },
  };
}
