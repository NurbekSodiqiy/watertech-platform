import { checklistPercent } from "@/lib/telemetry/aggregate";
import { percentChange, type PersonOverview, type PersonTotals } from "@/lib/admin/people";

// The admin overview's arithmetic (/admin, R3/S03): who the page is about, the
// headline totals of a window and their change against the window before.
// Pure, so tests/unit/admin/overview.test.ts pins it; the page only formats.

/** The people the overview reports on: operators and sales managers. The
 * admin is never one of them — telemetry does not record that role (CLAUDE.md
 * §9), so its zeros would read as idleness. A deactivated person stays in the
 * report only for a window in which they were still active. */
export function overviewPeople(people: readonly PersonOverview[]): PersonOverview[] {
  return people.filter((person) => person.role !== "admin" && (person.isActive || person.activeDays > 0));
}

/** Onboarding progress of one window, in % of the checklist: the items the
 * person ticked in the window (private.dashboard_checklist_completed, the
 * number the dashboard's operator cards show), capped at 100 — a renamed item
 * could otherwise count twice. null when there is no checklist. */
export function onboardingPercent(person: Pick<PersonTotals, "checklistCompleted">, checklistTotal: number): number | null {
  const percent = checklistPercent(person.checklistCompleted, checklistTotal);
  return percent === null ? null : Math.min(100, percent);
}

export interface OverviewTotals {
  /** People in the report (overviewPeople). */
  people: number;
  /** Of those, the ones with any event in the window. */
  activePeople: number;
  activeMs: number;
  contentViews: number;
  copies: number;
  /** Mean onboardingPercent over everyone in the report, rounded; null with
   * nobody to average or no checklist. */
  onboardingAverage: number | null;
}

export function overviewTotals(people: readonly PersonOverview[], checklistTotal: number): OverviewTotals {
  const reported = overviewPeople(people);
  const percents = reported
    .map((person) => onboardingPercent(person, checklistTotal))
    .filter((percent): percent is number => percent !== null);

  return {
    people: reported.length,
    activePeople: reported.filter((person) => person.activeDays > 0).length,
    activeMs: sum(reported, (person) => person.activeMs),
    contentViews: sum(reported, (person) => person.contentViews),
    copies: sum(reported, (person) => person.copies),
    onboardingAverage:
      percents.length === 0 ? null : Math.round(percents.reduce((total, percent) => total + percent, 0) / percents.length),
  };
}

export interface OverviewDeltas {
  /** People, absolute. */
  activePeople: number | null;
  /** Percent change. */
  activeMs: number | null;
  contentViews: number | null;
  copies: number | null;
  /** Percentage points. */
  onboardingAverage: number | null;
}

/** Change from `previous` (the equal-length window before) to `current`.
 * With no previous window — its read failed — every delta is null, never a
 * change against an imagined zero. */
export function overviewDeltas(current: OverviewTotals, previous: OverviewTotals | null): OverviewDeltas {
  if (!previous) {
    return { activePeople: null, activeMs: null, contentViews: null, copies: null, onboardingAverage: null };
  }
  return {
    activePeople: current.activePeople - previous.activePeople,
    activeMs: percentChange(current.activeMs, previous.activeMs),
    contentViews: percentChange(current.contentViews, previous.contentViews),
    copies: percentChange(current.copies, previous.copies),
    onboardingAverage:
      current.onboardingAverage === null || previous.onboardingAverage === null
        ? null
        : current.onboardingAverage - previous.onboardingAverage,
  };
}

/** `total / count`, rounded; null when there is nobody to divide by. */
export function averagePer(total: number, count: number): number | null {
  return count > 0 ? Math.round(total / count) : null;
}

/** Whether anyone in the report did anything in the window — the charts show
 * an empty state instead of a wall of zero bars when not. */
export function hasActivity(people: readonly PersonOverview[]): boolean {
  return people.some((person) => person.activeDays > 0);
}

/** Largest `score` first; ties by name, so the order is stable between renders. */
export function rankPeople(
  people: readonly PersonOverview[],
  score: (person: PersonOverview) => number
): PersonOverview[] {
  return [...people].sort((a, b) => score(b) - score(a) || displayName(a).localeCompare(displayName(b)));
}

/** The allow-list's full name, else the email. */
export function displayName(person: Pick<PersonOverview, "fullName" | "email">): string {
  const name = person.fullName?.trim();
  return name ? name : person.email;
}

/** Whole minutes, the unit of the daily series. */
export function toMinutes(ms: number): number {
  return Math.round(ms / 60_000);
}

function sum(people: readonly PersonOverview[], pick: (person: PersonOverview) => number): number {
  return people.reduce((total, person) => total + pick(person), 0);
}
