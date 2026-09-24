import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CONTENT_VIEW_TYPES,
  initialsFor,
  parsePersonParam,
  percentChange,
  personDeltas,
  personPath,
  toPersonDays,
  toPersonEvents,
  toPersonOverviews,
  toPersonSections,
  toPersonSummary,
  toTopContent,
  type ContentLabeler,
} from "@/lib/admin/people";
import { buildDashboardKpis } from "@/lib/dashboard/kpi";
import { MAX_RANGE_SPAN_DAYS } from "@/lib/dashboard/range";

// The expected rows of supabase/tests/people-checks.sql — the rows the 0021
// functions return on its fixture, as PostgREST sends them — run through the
// mappers here. A column the SQL renames or retypes fails one of the two.

const ROOT = path.resolve(__dirname, "../../..");
const CHECKS_PATH = path.join(ROOT, "supabase/tests/people-checks.sql");
const MIGRATION_PATH = path.join(ROOT, "supabase/migrations/0021_people_analytics.sql");

const rowsSchema = z.array(z.unknown());
const documentSchema = z.object({
  expected: z.object({
    overview: rowsSchema,
    summary: z.record(z.unknown()),
    daily: z.record(rowsSchema),
    sections: z.record(rowsSchema),
    recent_events: z.record(rowsSchema),
    top_content: rowsSchema,
  }),
});

function readPeopleDocument(): z.infer<typeof documentSchema> {
  const sql = readFileSync(CHECKS_PATH, "utf8");
  // Anchored on the set_config call: the header comment names the markers too.
  const match = /set_config\('people_checks\.doc', \$people\$([\s\S]*?)\$people\$/.exec(sql);
  if (!match) throw new Error(`no $people$ document in ${CHECKS_PATH}`);
  return documentSchema.parse(JSON.parse(match[1]));
}

const doc = readPeopleDocument();

function rowsOf(record: Record<string, unknown[]>, key: string): unknown[] {
  const rows = record[key];
  if (!rows) throw new Error(`no expected rows for ${key}`);
  return rows;
}

const ZERO_TOTALS = {
  activeMs: 0,
  activeDays: 0,
  sessions: 0,
  contentViews: 0,
  copies: 0,
  searches: 0,
  zeroResultSearches: 0,
  copilotAsks: 0,
  callsLogged: 0,
  checklistCompleted: 0,
};

describe("toPersonOverviews (admin_people_overview rows)", () => {
  const people = toPersonOverviews(doc.expected.overview);

  it("maps every column, timestamps normalized to toISOString()", () => {
    expect(people[0]).toEqual({
      email: "people-op1@test",
      fullName: "Ali Valiyev",
      role: "operator",
      isActive: true,
      addedAt: "2001-02-01T00:00:00.000Z",
      firstSeenAt: "2001-03-01T05:00:00.000Z",
      lastSeenAt: "2001-03-12T19:00:00.000Z",
      activeMs: 696000,
      activeDays: 2,
      sessions: 2,
      contentViews: 5,
      copies: 6,
      searches: 2,
      zeroResultSearches: 1,
      copilotAsks: 1,
      callsLogged: 35,
      checklistCompleted: 1,
      daily: [
        { day: "2001-03-10", activeMs: 575000, events: 26 },
        { day: "2001-03-11", activeMs: 0, events: 0 },
        { day: "2001-03-12", activeMs: 121000, events: 9 },
      ],
    });
  });

  it("keeps the SQL order and the admin row, zero-filled, with no first/last seen", () => {
    expect(people.map((p) => p.email)).toEqual([
      "people-op1@test",
      "people-mgr@test",
      "people-op2@test",
      "people-late@test",
      "people-admin@test",
      "people-off@test",
    ]);
    const admin = people.find((p) => p.role === "admin");
    expect(admin).toMatchObject({ ...ZERO_TOTALS, firstSeenAt: null, lastSeenAt: null });
    expect(admin?.daily.map((d) => d.events)).toEqual([0, 0, 0]);
  });

  it("keeps a null full name and an inactive row", () => {
    expect(people.find((p) => p.email === "people-op2@test")?.fullName).toBeNull();
    expect(people.find((p) => p.email === "people-off@test")?.isActive).toBe(false);
  });

  it("accepts bigint as a digit string, and nothing that is not a non-negative integer", () => {
    const [row] = doc.expected.overview;
    const base = z.record(z.unknown()).parse(row);
    expect(toPersonOverviews([{ ...base, active_ms: "696000" }])[0].activeMs).toBe(696000);
    for (const bad of [-1, 1.5, "1e3", "", null]) {
      expect(() => toPersonOverviews([{ ...base, copies: bad }])).toThrow();
    }
  });

  it("refuses an unknown role and a malformed timestamp", () => {
    const base = z.record(z.unknown()).parse(doc.expected.overview[0]);
    expect(() => toPersonOverviews([{ ...base, member_role: "owner" }])).toThrow();
    expect(() => toPersonOverviews([{ ...base, last_seen_at: "yesterday" }])).toThrow();
  });
});

describe("zero-filled days", () => {
  const base = z.record(z.unknown()).parse(doc.expected.overview[0]);
  const threeDays = [
    { day: "2001-03-10", active_ms: 0, events: 0 },
    { day: "2001-03-11", active_ms: 0, events: 0 },
    { day: "2001-03-12", active_ms: 0, events: 0 },
  ];

  it("keeps a zero day as a zero point, not a missing one", () => {
    const [person] = toPersonOverviews([{ ...base, daily: threeDays }]);
    expect(person.daily).toEqual([
      { day: "2001-03-10", activeMs: 0, events: 0 },
      { day: "2001-03-11", activeMs: 0, events: 0 },
      { day: "2001-03-12", activeMs: 0, events: 0 },
    ]);
  });

  it("refuses a gap, a repeat, and an impossible date", () => {
    const withGap = [threeDays[0], threeDays[2]];
    const withRepeat = [threeDays[0], threeDays[0]];
    expect(() => toPersonOverviews([{ ...base, daily: withGap }])).toThrow(/does not follow/);
    expect(() => toPersonOverviews([{ ...base, daily: withRepeat }])).toThrow(/does not follow/);
    expect(() => toPersonOverviews([{ ...base, daily: [{ day: "2001-02-30", active_ms: 0, events: 0 }] }])).toThrow();
    expect(() =>
      toPersonDays([
        { day: "2001-03-10", active_ms: 0, events: 0, content_views: 0 },
        { day: "2001-03-12", active_ms: 0, events: 0, content_views: 0 },
      ])
    ).toThrow(/does not follow/);
  });

  it("refuses rows of one window that cover different days", () => {
    const shifted = threeDays.map((d, i) => ({ ...d, day: `2001-03-1${i + 1}` }));
    expect(() =>
      toPersonOverviews([
        { ...base, daily: threeDays },
        { ...base, member_email: "b@test", daily: shifted },
      ])
    ).toThrow(/covers other days/);
  });

  it("crosses a month end", () => {
    const days = toPersonDays([
      { day: "2001-02-28", active_ms: 0, events: 0, content_views: 0 },
      { day: "2001-03-01", active_ms: 5, events: 1, content_views: 0 },
    ]);
    expect(days.map((d) => d.day)).toEqual(["2001-02-28", "2001-03-01"]);
  });
});

describe("toPersonSummary", () => {
  const summaries = z.record(z.unknown()).parse(doc.expected.summary);

  it("splits current and previous", () => {
    expect(toPersonSummary([summaries["people-op1@test"]])).toEqual({
      current: {
        activeMs: 696000,
        activeDays: 2,
        sessions: 2,
        contentViews: 5,
        copies: 6,
        searches: 2,
        zeroResultSearches: 1,
        copilotAsks: 1,
        callsLogged: 35,
        checklistCompleted: 1,
      },
      previous: {
        activeMs: 90000,
        activeDays: 2,
        sessions: 1,
        contentViews: 0,
        copies: 1,
        searches: 1,
        zeroResultSearches: 1,
        copilotAsks: 0,
        callsLogged: 0,
        checklistCompleted: 0,
      },
      firstSeenAt: "2001-03-01T05:00:00.000Z",
      lastSeenAt: "2001-03-12T19:00:00.000Z",
    });
  });

  it("maps the zero row of an unknown email and of an admin", () => {
    for (const email of ["people-nobody@test", "people-admin@test"]) {
      expect(toPersonSummary([summaries[email]])).toEqual({
        current: ZERO_TOTALS,
        previous: ZERO_TOTALS,
        firstSeenAt: null,
        lastSeenAt: null,
      });
    }
  });

  it("throws unless there is exactly one row", () => {
    expect(() => toPersonSummary([])).toThrow(/0 rows/);
    expect(() => toPersonSummary([summaries["people-op1@test"], summaries["people-op1@test"]])).toThrow(/2 rows/);
  });
});

describe("toPersonDays, toPersonSections, toPersonEvents", () => {
  it("maps the daily rows", () => {
    expect(toPersonDays(rowsOf(doc.expected.daily, "people-op1@test"))).toEqual([
      { day: "2001-03-10", activeMs: 575000, events: 26, contentViews: 3 },
      { day: "2001-03-11", activeMs: 0, events: 0, contentViews: 0 },
      { day: "2001-03-12", activeMs: 121000, events: 9, contentViews: 2 },
    ]);
  });

  it("maps the sections", () => {
    expect(toPersonSections(rowsOf(doc.expected.sections, "people-op1@test"))).toEqual([
      { section: "sales-process", activeMs: 600000, visits: 1 },
      { section: "products", activeMs: 120000, visits: 1 },
      { section: "faq", activeMs: 60000, visits: 1 },
      { section: "home", activeMs: 36000, visits: 3 },
    ]);
    expect(toPersonSections(rowsOf(doc.expected.sections, "people-admin@test"))).toEqual([]);
  });

  it("maps the events, meta included", () => {
    expect(toPersonEvents(rowsOf(doc.expected.recent_events, "people-op1@test"))).toEqual([
      { ts: "2001-03-12T19:00:00.000Z", type: "page_enter", path: "/", entityType: null, entityId: null, meta: null },
      {
        ts: "2001-03-12T18:59:59.999Z",
        type: "copy",
        path: "/sales-process/scripts",
        entityType: "stage",
        entityId: "st-1",
        meta: null,
      },
      {
        ts: "2001-03-12T05:05:00.000Z",
        type: "call_count_log",
        path: "/",
        entityType: "daily_task",
        entityId: "1",
        meta: { count: "3" },
      },
    ]);
  });

  it("shows a legacy non-object meta as null instead of failing the timeline", () => {
    const [event] = toPersonEvents([
      {
        event_ts: "2001-03-12T05:05:00+00:00",
        event_type: "page_view",
        event_path: "/",
        event_entity_type: null,
        event_entity_id: null,
        event_meta: [1, 2],
      },
    ]);
    expect(event).toMatchObject({ type: "page_view", meta: null });
  });
});

describe("toTopContent", () => {
  const labelFor: ContentLabeler = (viewType, entityId, itemPath) => ({
    label: `${viewType}:${entityId ?? itemPath}`,
    adminHref: entityId ? `/admin/${entityId}` : null,
  });

  it("maps the ranked rows and labels each one through the given labeler", () => {
    const items = toTopContent(doc.expected.top_content, labelFor);
    expect(items[0]).toEqual({
      label: "stage_view:st-1",
      adminHref: "/admin/st-1",
      viewType: "stage_view",
      entityId: "st-1",
      path: "/sales-process/scripts",
      views: 4,
      copies: 3,
      people: 3,
    });
    expect(items.find((item) => item.entityId === null)).toMatchObject({
      label: "stage_view:/sales-process/scripts/lead-orqali-tushgan",
      adminHref: null,
    });
    expect(items.at(-1)).toMatchObject({ entityId: "obj-arzon", views: 0, copies: 1 });
  });

  it("only accepts the six content view types", () => {
    expect(CONTENT_VIEW_TYPES).toHaveLength(6);
    expect(() =>
      toTopContent(
        [{ view_type: "copy", view_entity_id: "x", view_path: "/", views: 0, copies: 1, people: 1 }],
        labelFor
      )
    ).toThrow();
  });
});

describe("percentChange / personDeltas", () => {
  it("is the percent change, rounded; null when there is nothing to compare against", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 5)).toBe(-100);
    expect(percentChange(1, 3)).toBe(-67);
    expect(percentChange(7, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("rounds exactly like the dashboard's KPI cards", () => {
    const pairs: [number, number][] = [
      [1005, 1000],
      [995, 1000],
      [3, 2],
      [1, 8],
      [0, 1],
      [12, 0],
      [0, 0],
    ];
    for (const [current, previous] of pairs) {
      const kpi = buildDashboardKpis(
        {
          current: { activeOperators: 0, activeMs: current, zeroResultSearches: 0 },
          previous: { activeOperators: 0, activeMs: previous, zeroResultSearches: 0 },
        },
        0
      );
      expect(Object.is(percentChange(current, previous), kpi.totalActiveMs.deltaPercent)).toBe(true);
    }
  });

  it("covers every total of a summary", () => {
    const summaries = z.record(z.unknown()).parse(doc.expected.summary);
    const deltas = personDeltas(toPersonSummary([summaries["people-op1@test"]]));
    expect(deltas).toEqual({
      activeMs: 673,
      activeDays: 0,
      sessions: 100,
      contentViews: null,
      copies: 500,
      searches: 100,
      zeroResultSearches: 0,
      copilotAsks: null,
      callsLogged: null,
      checklistCompleted: null,
    });
  });
});

describe("personPath / parsePersonParam", () => {
  const segmentOf = (email: string): string => {
    const segment = personPath(email).split("/").at(-1);
    if (segment === undefined) throw new Error("no segment");
    return segment;
  };

  it("builds /admin/users/<encoded email>", () => {
    expect(personPath("ali+test@watertech.uz")).toBe("/admin/users/ali%2Btest%40watertech.uz");
  });

  it.each(["ali@watertech.uz", "ali+test@watertech.uz", "ali.valiyev@water.tech.uz", "a.b+c.d@x.uz"])(
    "round-trips %s",
    (email) => {
      expect(parsePersonParam(segmentOf(email))).toBe(email);
      // Next may hand the segment over already decoded; that parses the same.
      expect(parsePersonParam(email)).toBe(email);
    }
  );

  it("lowercases and trims, like the allow-list does", () => {
    expect(parsePersonParam(segmentOf("Ali.Valiyev@WaterTech.UZ"))).toBe("ali.valiyev@watertech.uz");
    expect(parsePersonParam("%20ali%40watertech.uz%20")).toBe("ali@watertech.uz");
  });

  it("answers null for a malformed escape or a non-email", () => {
    for (const raw of ["%", "%E0%A4%A", "ali%ZZ@watertech.uz", "", "not-an-email", "ali%2540watertech.uz"]) {
      expect(parsePersonParam(raw)).toBeNull();
    }
  });
});

describe("initialsFor", () => {
  it.each([
    ["Ali Valiyev", "x@test", "AV"],
    ["  ali   valiyev  ", "x@test", "AV"],
    ["Ali Vali Valiyev", "x@test", "AV"],
    ["Nurbek", "x@test", "N"],
    ["O'tkir Karimov", "x@test", "OK"],
    ["'Ali", "x@test", "A"],
    ["Ольга Петрова", "x@test", "ОП"],
    [null, "ali.valiyev@watertech.uz", "AV"],
    [null, "nurbek@watertech.uz", "N"],
    ["", "ali_v+test@watertech.uz", "AT"],
    ["   ", "ali-valiyev@watertech.uz", "AV"],
    [null, "...@watertech.uz", "?"],
  ])("(%j, %s) → %s", (fullName, email, initials) => {
    expect(initialsFor(fullName, email)).toBe(initials);
  });
});

describe("0021 limits match the app's", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("the longest window is the dashboard's longest range", () => {
    const match = /max_span constant interval := interval '(\d+) days';/.exec(sql);
    expect(match?.[1]).toBe(String(MAX_RANGE_SPAN_DAYS + 1));
  });

  it("names the six view types the TS knows", () => {
    for (const type of CONTENT_VIEW_TYPES) expect(sql).toContain(`'${type}'`);
  });
});
