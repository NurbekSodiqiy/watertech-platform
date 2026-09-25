import { z } from "zod";
import type { TelemetryEventType } from "@/lib/telemetry/types";
import { USER_ROLES, userEmailSchema, type UserRole } from "@/lib/admin/users";

// People analytics (R3/S02): the rows of the 0021 SQL functions
// (supabase/migrations/0021_people_analytics.sql) in the shapes the people
// directory (/admin/users, S03) and the person page (/admin/users/[email], S04)
// take. No server imports: client islands use the types, personPath and
// initialsFor; the RPC calls themselves are lib/admin/people-queries.ts.
//
// Every mapper parses its rows with zod and throws on a shape it does not
// expect — toWidget (lib/dashboard/telemetry-window.ts) turns that into the
// widget's error state instead of a silently wrong number. Rows are already in
// the order the SQL ranked them; nothing here re-sorts.
// tests/unit/admin/people.test.ts feeds the expected rows of
// supabase/tests/people-checks.sql through these mappers.

/** A count or a millisecond total. PostgREST sends bigint as a JSON number; a
 * digit string (what a driver that keeps bigint exact would send) is accepted
 * too. Always a non-negative safe integer after parsing. */
const countSchema = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));

/** A timestamptz as PostgREST sends it ("…+00:00"), normalized to
 * toISOString() form so every consumer compares one format. */
const instantSchema = z.string().transform((value, ctx) => {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "not a timestamp" });
    return z.NEVER;
  }
  return new Date(ms).toISOString();
});

/** A Postgres `date`: "YYYY-MM-DD", and a real calendar day. */
const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => !Number.isNaN(Date.parse(`${day}T00:00:00.000Z`)) && addOneDay(day, 0) === day, {
    message: "not a calendar day",
  });

function addOneDay(day: string, days = 1): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The zero-fill promise of the SQL, checked: each day follows the one before.
 * A gap would draw as a missing bar, which reads like a day off. */
function assertConsecutiveDays(days: readonly { day: string }[], what: string): void {
  for (let i = 1; i < days.length; i += 1) {
    if (days[i].day !== addOneDay(days[i - 1].day)) {
      throw new Error(`${what}: ${days[i].day} does not follow ${days[i - 1].day}`);
    }
  }
}

/** The six content view events (0016 / 0021) — admin_top_content's view_type. */
export const CONTENT_VIEW_TYPES = [
  "script_select",
  "stage_view",
  "objection_view",
  "faq_view",
  "competitor_view",
  "package_view",
] as const satisfies readonly TelemetryEventType[];
export type ContentViewType = (typeof CONTENT_VIEW_TYPES)[number];

// --- Shapes -------------------------------------------------------------------

/** One person's activity over one window — the definitions are in the header
 * of 0021 ("SEMANTICS"). An admin's totals are always zero: telemetry does not
 * record admins, so the UI shows "no telemetry" for that role instead. */
export interface PersonTotals {
  activeMs: number;
  activeDays: number;
  sessions: number;
  contentViews: number;
  copies: number;
  searches: number;
  zeroResultSearches: number;
  copilotAsks: number;
  callsLogged: number;
  checklistCompleted: number;
}

/** One Tashkent day of a person's series (YYYY-MM-DD), zero-filled. */
export interface PersonDayPoint {
  day: string;
  activeMs: number;
  events: number;
}

/** One allow-list row of the people directory, with its window totals. */
export interface PersonOverview extends PersonTotals {
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  /** allowed_users.created_at. */
  addedAt: string;
  /** Over all retained telemetry (180 days), not only the window; null when none. */
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  /** Every day of the window, oldest first. */
  daily: PersonDayPoint[];
}

/** The person page's header numbers: the window and the equal-length one before. */
export interface PersonSummary {
  current: PersonTotals;
  previous: PersonTotals;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface PersonDay extends PersonDayPoint {
  contentViews: number;
}

/** Page time per app section ("sales-process", "faq", "home", …). Idle time is
 * not subtracted per section, so the sections can add up to more than the
 * person's activeMs. */
export interface PersonSection {
  section: string;
  activeMs: number;
  visits: number;
}

/** One event of the person's recent timeline. `type` is whatever the row holds
 * — usually a TelemetryEventType, but an old row may carry a type this release
 * no longer sends. */
export interface PersonEvent {
  ts: string;
  type: string;
  path: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
}

/** A content item's human label and admin editor link, when one exists. */
export interface ContentLabel {
  label: string;
  adminHref: string | null;
}

/** Resolves an item to its label — needs the content bundle, so the server
 * supplies it (lib/admin/people-queries.ts). */
export type ContentLabeler = (viewType: ContentViewType, entityId: string | null, path: string) => ContentLabel;

export interface TopContentItem extends ContentLabel {
  viewType: ContentViewType;
  entityId: string | null;
  path: string;
  views: number;
  /** Copies attributed to this item (CopyButton's entityType/entityId). */
  copies: number;
  /** Distinct people who viewed or copied it. */
  people: number;
}

/** The allow-list row behind /admin/users/[email] — the 404 decision and the
 * page header. */
export interface PersonRecord {
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  addedAt: string;
}

// --- Row schemas (0021's RETURNS TABLE columns) ----------------------------------

const dailyPointSchema = z.object({ day: daySchema, active_ms: countSchema, events: countSchema });

const overviewRowSchema = z.object({
  member_email: z.string().min(1),
  member_full_name: z.string().nullable(),
  member_role: z.enum(USER_ROLES),
  member_is_active: z.boolean(),
  member_added_at: instantSchema,
  first_seen_at: instantSchema.nullable(),
  last_seen_at: instantSchema.nullable(),
  active_ms: countSchema,
  active_days: countSchema,
  sessions: countSchema,
  content_views: countSchema,
  copies: countSchema,
  searches: countSchema,
  zero_result_searches: countSchema,
  copilot_asks: countSchema,
  calls_logged: countSchema,
  checklist_completed: countSchema,
  daily: z.array(dailyPointSchema),
});

const summaryRowSchema = z.object({
  active_ms: countSchema,
  active_ms_prev: countSchema,
  active_days: countSchema,
  active_days_prev: countSchema,
  sessions: countSchema,
  sessions_prev: countSchema,
  content_views: countSchema,
  content_views_prev: countSchema,
  copies: countSchema,
  copies_prev: countSchema,
  searches: countSchema,
  searches_prev: countSchema,
  zero_result_searches: countSchema,
  zero_result_searches_prev: countSchema,
  copilot_asks: countSchema,
  copilot_asks_prev: countSchema,
  calls_logged: countSchema,
  calls_logged_prev: countSchema,
  checklist_completed: countSchema,
  checklist_completed_prev: countSchema,
  first_seen_at: instantSchema.nullable(),
  last_seen_at: instantSchema.nullable(),
});

const dayRowSchema = z.object({
  day: daySchema,
  active_ms: countSchema,
  events: countSchema,
  content_views: countSchema,
});

const sectionRowSchema = z.object({
  section: z.string().min(1),
  active_ms: countSchema,
  visits: countSchema,
});

/** meta is a JSON object on every row /api/events has written; anything else
 * (a legacy row) is shown without it rather than failing the whole timeline. */
const metaSchema = z
  .unknown()
  .transform((value): Record<string, unknown> | null => (isPlainObject(value) ? value : null));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const eventRowSchema = z.object({
  event_ts: instantSchema,
  event_type: z.string().min(1),
  event_path: z.string(),
  event_entity_type: z.string().nullable(),
  event_entity_id: z.string().nullable(),
  event_meta: metaSchema,
});

const topContentRowSchema = z.object({
  view_type: z.enum(CONTENT_VIEW_TYPES),
  view_entity_id: z.string().nullable(),
  view_path: z.string(),
  views: countSchema,
  copies: countSchema,
  people: countSchema,
});

// --- Mappers ----------------------------------------------------------------------
// They take `unknown` rows: the zod schema is what types them, whatever the
// hand-written database.types.ts says.

export function toPersonOverviews(rows: readonly unknown[]): PersonOverview[] {
  const people = rows.map((raw) => {
    const row = overviewRowSchema.parse(raw);
    const daily = row.daily.map((point) => ({ day: point.day, activeMs: point.active_ms, events: point.events }));
    assertConsecutiveDays(daily, `admin_people_overview daily of ${row.member_email}`);
    return {
      email: row.member_email,
      fullName: row.member_full_name,
      role: row.member_role,
      isActive: row.member_is_active,
      addedAt: row.member_added_at,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      activeMs: row.active_ms,
      activeDays: row.active_days,
      sessions: row.sessions,
      contentViews: row.content_views,
      copies: row.copies,
      searches: row.searches,
      zeroResultSearches: row.zero_result_searches,
      copilotAsks: row.copilot_asks,
      callsLogged: row.calls_logged,
      checklistCompleted: row.checklist_completed,
      daily,
    };
  });

  // One window, so one set of days for everyone: the directory draws the
  // series side by side.
  const first = people.at(0);
  if (first) {
    for (const person of people) {
      if (person.daily.length !== first.daily.length || person.daily[0]?.day !== first.daily[0]?.day) {
        throw new Error(`admin_people_overview: ${person.email} covers other days than ${first.email}`);
      }
    }
  }
  return people;
}

/** Throws unless the function returned exactly one row — it always does, a
 * zero row included, so anything else is a broken call. */
export function toPersonSummary(rows: readonly unknown[]): PersonSummary {
  if (rows.length !== 1) throw new Error(`admin_person_summary returned ${rows.length} rows`);
  const row = summaryRowSchema.parse(rows[0]);
  return {
    current: {
      activeMs: row.active_ms,
      activeDays: row.active_days,
      sessions: row.sessions,
      contentViews: row.content_views,
      copies: row.copies,
      searches: row.searches,
      zeroResultSearches: row.zero_result_searches,
      copilotAsks: row.copilot_asks,
      callsLogged: row.calls_logged,
      checklistCompleted: row.checklist_completed,
    },
    previous: {
      activeMs: row.active_ms_prev,
      activeDays: row.active_days_prev,
      sessions: row.sessions_prev,
      contentViews: row.content_views_prev,
      copies: row.copies_prev,
      searches: row.searches_prev,
      zeroResultSearches: row.zero_result_searches_prev,
      copilotAsks: row.copilot_asks_prev,
      callsLogged: row.calls_logged_prev,
      checklistCompleted: row.checklist_completed_prev,
    },
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function toPersonDays(rows: readonly unknown[]): PersonDay[] {
  const days = rows.map((raw) => {
    const row = dayRowSchema.parse(raw);
    return { day: row.day, activeMs: row.active_ms, events: row.events, contentViews: row.content_views };
  });
  assertConsecutiveDays(days, "admin_person_daily");
  return days;
}

export function toPersonSections(rows: readonly unknown[]): PersonSection[] {
  return rows.map((raw) => {
    const row = sectionRowSchema.parse(raw);
    return { section: row.section, activeMs: row.active_ms, visits: row.visits };
  });
}

export function toPersonEvents(rows: readonly unknown[]): PersonEvent[] {
  return rows.map((raw) => {
    const row = eventRowSchema.parse(raw);
    return {
      ts: row.event_ts,
      type: row.event_type,
      path: row.event_path,
      entityType: row.event_entity_type,
      entityId: row.event_entity_id,
      meta: row.event_meta,
    };
  });
}

export function toTopContent(rows: readonly unknown[], labelFor: ContentLabeler): TopContentItem[] {
  return rows.map((raw) => {
    const row = topContentRowSchema.parse(raw);
    return {
      ...labelFor(row.view_type, row.view_entity_id, row.view_path),
      viewType: row.view_type,
      entityId: row.view_entity_id,
      path: row.view_path,
      views: row.views,
      copies: row.copies,
      people: row.people,
    };
  });
}

// --- Deltas -----------------------------------------------------------------------

/** Percent change from `previous` to `current`, rounded like the dashboard's
 * KPI cards (lib/dashboard/kpi.ts delta(): Math.round, so .5 rounds up); null
 * when previous is 0 — there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type PersonDeltas = { [K in keyof PersonTotals]: number | null };

/** percentChange for every total of a summary. */
export function personDeltas(summary: PersonSummary): PersonDeltas {
  const { current, previous } = summary;
  return {
    activeMs: percentChange(current.activeMs, previous.activeMs),
    activeDays: percentChange(current.activeDays, previous.activeDays),
    sessions: percentChange(current.sessions, previous.sessions),
    contentViews: percentChange(current.contentViews, previous.contentViews),
    copies: percentChange(current.copies, previous.copies),
    searches: percentChange(current.searches, previous.searches),
    zeroResultSearches: percentChange(current.zeroResultSearches, previous.zeroResultSearches),
    copilotAsks: percentChange(current.copilotAsks, previous.copilotAsks),
    callsLogged: percentChange(current.callsLogged, previous.callsLogged),
    checklistCompleted: percentChange(current.checklistCompleted, previous.checklistCompleted),
  };
}

// --- The person page's URL ----------------------------------------------------------

/** Locale-less; build links with the next-intl Link from @/i18n/routing. */
export function personPath(email: string): string {
  return `/admin/users/${encodeURIComponent(email)}`;
}

/** The [email] segment back to an allow-list email, or null (→ notFound()).
 * Decoded once more because the segment may still be percent-encoded; a
 * malformed escape is null, never a thrown URIError. Parsed with the
 * allow-list's own schema, so it comes back trimmed and lowercased. */
export function parsePersonParam(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const parsed = userEmailSchema.safeParse(decoded);
  return parsed.success ? parsed.data : null;
}

// --- Names and avatars -----------------------------------------------------------------

/** The allow-list's full name, else the email. */
export function displayName(person: { fullName: string | null; email: string }): string {
  const name = person.fullName?.trim();
  return name ? name : person.email;
}

/** The part of the email before the "@" — a person's name where the allow-list
 * has none and the email would not fit ("ali.valiyev@gmail.com" → "ali.valiyev"). */
export function emailLocalPart(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

const FIRST_LETTER = /[\p{L}\p{N}]/u;

function initialsOfWords(words: readonly string[]): string {
  const letters = words.flatMap((word) => {
    const match = FIRST_LETTER.exec(word);
    return match ? [match[0]] : [];
  });
  if (letters.length === 0) return "";
  const picked = letters.length === 1 ? letters : [letters[0], letters[letters.length - 1]];
  return picked.join("").toUpperCase();
}

/** One or two letters for an avatar: first and last word of the full name
 * ("Ali Valiyev" → "AV", "Nurbek" → "N"), else the parts of the email's local
 * part ("ali.valiyev@…" → "AV"), else "?". Each word contributes its first
 * letter or digit, so punctuation in front of it is skipped ("'Ali" → "A"). */
export function initialsFor(fullName: string | null, email: string): string {
  const fromName = fullName ? initialsOfWords(fullName.trim().split(/\s+/)) : "";
  if (fromName) return fromName;
  const localPart = email.split("@")[0] ?? "";
  return initialsOfWords(localPart.split(/[._+-]+/)) || "?";
}
