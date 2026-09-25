import { getTranslations } from "next-intl/server";
import {
  Bot,
  CalendarCheck,
  CalendarDays,
  Clock,
  Copy,
  Eye,
  History,
  LayoutGrid,
  Lock,
  LogIn,
  PhoneCall,
  Search,
  SearchX,
  Timer,
  Trophy,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { DashboardWidgetError } from "@/components/dashboard/DashboardWidgetError";
import { BarList } from "@/components/admin/charts/BarList";
import { ChartCard } from "@/components/admin/charts/ChartCard";
import { ColumnBars } from "@/components/admin/charts/ColumnBars";
import { ProgressBar } from "@/components/admin/charts/ProgressBar";
import { StatCard } from "@/components/admin/charts/StatCard";
import { PersonAccessPanel } from "@/components/admin/people/PersonAccessPanel";
import { PersonHeader } from "@/components/admin/people/PersonHeader";
import { PersonTimeline } from "@/components/admin/people/PersonTimeline";
import { averagePer, onboardingPercent, toMinutes } from "@/lib/admin/overview";
import {
  emailLocalPart,
  personDeltas,
  personPath,
  type PersonDay,
  type PersonRecord,
  type PersonSection,
  type PersonSummary,
} from "@/lib/admin/people";
import { resolveSection, type TimelineEntry } from "@/lib/admin/person-page";
import { isAssignableRole } from "@/lib/admin/users";
import { formatDuration } from "@/lib/dashboard/format";
import type { MostViewedItem, ZeroResultQueryGroup } from "@/lib/dashboard/quality";
import { rangeDayCount, type DashboardRange } from "@/lib/dashboard/range";
import type { WidgetData } from "@/lib/dashboard/telemetry-window";
import { TOTAL_ONBOARDING_ITEMS } from "@/lib/telemetry/aggregate";

/** Every read of the person page, each with its own ok / failed state. */
export interface PersonWidgets {
  summary: WidgetData<PersonSummary>;
  daily: WidgetData<PersonDay[]>;
  /** Events per Tashkent hour, index = hour. */
  hourly: WidgetData<number[]>;
  sections: WidgetData<PersonSection[]>;
  topViewed: WidgetData<MostViewedItem[]>;
  zeroSearches: WidgetData<ZeroResultQueryGroup[]>;
  timeline: WidgetData<TimelineEntry[]>;
}

export interface PersonDetailProps {
  locale: string;
  person: PersonRecord;
  /** The signed-in admin is this person. */
  isSelf: boolean;
  /** The window every number is about (operatorEmail is always null here — the
   * person is the page's path, not a filter). */
  range: DashboardRange;
  /** null for an admin row: telemetry is never recorded for that role, so
   * there is nothing to read and nothing was fetched. */
  widgets: PersonWidgets | null;
}

function intlLocale(locale: string): string {
  return locale === "ru" ? "ru-RU" : "uz-UZ";
}

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/** The person page's body (/admin/users/[email], R3/S04), apart from its reads
 * so the page stays a thin fetch-and-render: who they are, how much they
 * worked and used the app over a range (against the equal-length range
 * before), when and on what, and what they did last — next to the switch that
 * decides whether and as what they may sign in. Every widget fails and empties
 * on its own (CLAUDE.md §15): a failed read renders DashboardWidgetError in
 * that widget's slot, no data an EmptyState — never a silent zero. */
export async function PersonDetail({ locale, person, isSelf, range, widgets }: PersonDetailProps) {
  const [t, tNav, tDuration, tUsers] = await Promise.all([
    getTranslations("pages.admin.people.person"),
    getTranslations("nav"),
    getTranslations("dashboard.duration"),
    getTranslations("pages.admin.users"),
  ]);

  const numbers = new Intl.NumberFormat(intlLocale(locale));
  const dayFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" });
  const num = (value: number): string => numbers.format(value);
  const duration = (ms: number): string => formatDuration(ms, tDuration);

  const summary = widgets?.summary;
  const name = person.fullName?.trim() || emailLocalPart(person.email);

  // What the access panel can do: an admin row is SQL-editor-only, so it gets
  // the note instead of the controls.
  const accessSlot = isAssignableRole(person.role) ? (
    <PersonAccessPanel email={person.email} name={name} role={person.role} isActive={person.isActive} isSelf={isSelf} />
  ) : (
    <ChartCard icon={Lock} title={t("locked.title")} description={t("locked.description")}>
      <p className="text-[13px] text-text-secondary">{tUsers("adminLocked")}</p>
    </ChartCard>
  );

  const header = (
    <PersonHeader
      locale={locale}
      person={person}
      isSelf={isSelf}
      firstSeenAt={summary?.ok ? summary.data.firstSeenAt : undefined}
      lastSeenAt={summary?.ok ? summary.data.lastSeenAt : undefined}
    />
  );

  if (!widgets) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {header}
        <div className="max-w-md">{accessSlot}</div>
      </div>
    );
  }

  const noEvents = (
    <EmptyState
      variant="compact"
      stateKey="dashboardNoEvents"
      title={t("empty.noActivity.title")}
      reason={t("empty.noActivity.reason")}
    />
  );

  const { daily, hourly, sections, topViewed, zeroSearches, timeline } = widgets;
  const inactive = summary?.ok === true && summary.data.current.activeDays === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {header}

      <RangePicker range={range} basePath={personPath(person.email)} />

      {summary?.ok ? (
        <>
          {inactive && noEvents}
          <StatsGrid summary={summary.data} range={range} t={t} num={num} duration={duration} />
        </>
      ) : (
        <DashboardWidgetError />
      )}

      <ChartCard icon={CalendarDays} title={t("daily.title")} description={t("daily.description")}>
        {!daily.ok ? (
          <DashboardWidgetError />
        ) : daily.data.every((day) => day.events === 0) ? (
          noEvents
        ) : (
          <ColumnBars
            tone="green"
            label={t("daily.title")}
            points={daily.data.map((day) => {
              const minutes = toMinutes(day.activeMs);
              return {
                key: day.day,
                label: String(Number(day.day.slice(8))),
                value: minutes,
                display: num(minutes),
                // The tooltip carries the event count the bar height does not.
                title: t("daily.pointTitle", {
                  date: dayFormat.format(new Date(`${day.day}T00:00:00.000Z`)),
                  minutes: num(minutes),
                  events: num(day.events),
                }),
              };
            })}
          />
        )}
      </ChartCard>

      <ChartCard icon={Clock} title={t("hourly.title")} description={t("hourly.description")}>
        {!hourly.ok ? (
          <DashboardWidgetError />
        ) : hourly.data.every((count) => count === 0) ? (
          noEvents
        ) : (
          <ColumnBars
            tone="blue"
            label={t("hourly.title")}
            points={hourly.data.map((count, hour) => {
              const label = String(hour).padStart(2, "0");
              return {
                key: label,
                label,
                value: count,
                display: num(count),
                title: t("hourly.pointTitle", { hour: `${label}:00`, count: num(count) }),
              };
            })}
          />
        )}
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard icon={LayoutGrid} title={t("sections.title")} description={t("sections.description")}>
          {!sections.ok ? (
            <DashboardWidgetError />
          ) : (
            <BarList
              tone="green"
              label={t("sections.title")}
              empty={noEvents}
              rows={sections.data.map((section) => {
                const resolved = resolveSection(section.section);
                return {
                  key: section.section,
                  label:
                    resolved.kind === "home"
                      ? t("sections.home")
                      : resolved.kind === "nav"
                        ? tNav(resolved.titleKey)
                        : resolved.section,
                  sublabel: t("sections.visits", { count: section.visits }),
                  value: section.activeMs,
                  display: duration(section.activeMs),
                };
              })}
            />
          )}
        </ChartCard>

        <ChartCard icon={Trophy} title={t("topViewed.title")} description={t("topViewed.description")}>
          {!topViewed.ok ? (
            <DashboardWidgetError />
          ) : (
            <BarList
              tone="blue"
              label={t("topViewed.title")}
              empty={noEvents}
              rows={topViewed.data.map((item, index) => ({
                key: `${index}:${item.label}`,
                label: item.label,
                value: item.count,
                display: t("topViewed.views", { count: item.count }),
                href: item.adminHref ?? undefined,
              }))}
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          icon={History}
          title={t("timeline.title")}
          description={t("timeline.description")}
          className="lg:col-span-2"
        >
          {timeline.ok ? <PersonTimeline entries={timeline.data} /> : <DashboardWidgetError />}
        </ChartCard>

        <div className="space-y-4">
          {accessSlot}

          <ChartCard icon={SearchX} title={t("zeroSearches.title")} description={t("zeroSearches.description")}>
            {!zeroSearches.ok ? (
              <DashboardWidgetError />
            ) : zeroSearches.data.length === 0 ? (
              <EmptyState
                variant="compact"
                stateKey="searchNoResults"
                title={t("zeroSearches.empty.title")}
                reason={t("zeroSearches.empty.reason")}
              />
            ) : (
              <ul className="divide-y divide-border">
                {zeroSearches.data.map((item) => (
                  <li key={item.query} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                    <span className="min-w-0 break-words text-primary-dark">
                      {t("zeroSearches.query", { query: item.query })}
                    </span>
                    <span className="shrink-0 rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                      {t("zeroSearches.times", { count: item.count })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

/** The eight headline numbers, each against the equal-length range before, and
 * the onboarding checklist bar under them. */
function StatsGrid({
  summary,
  range,
  t,
  num,
  duration,
}: {
  summary: PersonSummary;
  range: DashboardRange;
  t: Translator;
  num: (value: number) => string;
  duration: (ms: number) => string;
}) {
  const { current } = summary;
  const deltas = personDeltas(summary);
  const days = rangeDayCount(range);
  const perActiveDay = (total: number, format: (value: number) => string): string => {
    const average = averagePer(total, current.activeDays);
    return average === null ? t("stats.noActiveDays") : t("stats.perActiveDay", { value: format(average) });
  };

  const onboarding = onboardingPercent(current, TOTAL_ONBOARDING_ITEMS);
  const onboardingDone = Math.min(current.checklistCompleted, TOTAL_ONBOARDING_ITEMS);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Timer}
          label={t("stats.activeTime")}
          value={duration(current.activeMs)}
          caption={perActiveDay(current.activeMs, duration)}
          delta={{ value: deltas.activeMs, unit: "%" }}
        />
        <StatCard
          icon={CalendarCheck}
          label={t("stats.activeDays")}
          value={num(current.activeDays)}
          caption={t("stats.ofDays", { count: days })}
          delta={{ value: deltas.activeDays, unit: "%" }}
        />
        <StatCard
          icon={LogIn}
          label={t("stats.sessions")}
          value={num(current.sessions)}
          caption={perActiveDay(current.sessions, num)}
          delta={{ value: deltas.sessions, unit: "%" }}
        />
        <StatCard
          icon={Eye}
          label={t("stats.views")}
          value={num(current.contentViews)}
          caption={perActiveDay(current.contentViews, num)}
          delta={{ value: deltas.contentViews, unit: "%" }}
        />
        <StatCard
          icon={Copy}
          label={t("stats.copies")}
          value={num(current.copies)}
          caption={perActiveDay(current.copies, num)}
          delta={{ value: deltas.copies, unit: "%" }}
        />
        <StatCard
          icon={Search}
          label={t("stats.searches")}
          value={num(current.searches)}
          caption={t("stats.searchesCaption", { count: num(current.zeroResultSearches) })}
          delta={{ value: deltas.searches, unit: "%" }}
        />
        <StatCard
          icon={Bot}
          label={t("stats.copilot")}
          value={num(current.copilotAsks)}
          caption={perActiveDay(current.copilotAsks, num)}
          delta={{ value: deltas.copilotAsks, unit: "%" }}
        />
        <StatCard
          icon={PhoneCall}
          label={t("stats.calls")}
          value={num(current.callsLogged)}
          caption={t("stats.callsCaption")}
          delta={{ value: deltas.callsLogged, unit: "%" }}
        />
      </div>

      {onboarding !== null && (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-softer">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[13px] font-medium text-primary-dark">{t("onboarding.title")}</p>
            <p className="text-[12.5px] font-semibold tabular-nums text-primary-dark">
              {t("onboarding.value", { done: num(onboardingDone), total: num(TOTAL_ONBOARDING_ITEMS), percent: onboarding })}
            </p>
          </div>
          <div className="mt-2.5">
            <ProgressBar percent={onboarding} label={t("onboarding.title")} />
          </div>
          <p className="mt-2 text-[12px] text-text-secondary">{t("onboarding.caption")}</p>
        </div>
      )}
    </div>
  );
}
