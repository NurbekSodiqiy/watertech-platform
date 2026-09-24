import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, maybeSingle, eq } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  return { rpc: vi.fn(), maybeSingle, eq };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ rpc, from: () => ({ select: () => ({ eq }) }) }),
}));
vi.mock("@/lib/content/loader", () => ({
  getContentBundleOrEmpty: async () => ({
    scripts: [],
    objections: [{ id: "obj-qimmat", label: "Qimmat" }],
    faqs: [],
    competitors: [],
    packageGroups: [],
  }),
}));
// Reached through telemetry-window (toWidget) and never called here; the real
// module builds the service-role client at import.
vi.mock("@/lib/dashboard/content-health", () => ({ getContentHealth: vi.fn() }));

import {
  fetchPeopleOverview,
  fetchPersonDaily,
  fetchPersonRecentEvents,
  fetchPersonSections,
  fetchPersonSummary,
  fetchTopContent,
  getPersonRecord,
  RECENT_EVENTS_LIMIT,
  TOP_CONTENT_LIMIT,
} from "@/lib/admin/people-queries";

// 14-20 September in Tashkent: 19:00 UTC the evening before each end; the
// previous 7-day range starts on the 7th.
const RANGE = { from: "2026-09-14", to: "2026-09-20" };
const WINDOW = { p_from: "2026-09-13T19:00:00.000Z", p_to: "2026-09-20T19:00:00.000Z" };
const PREVIOUS_START = "2026-09-06T19:00:00.000Z";
const EMAIL = "ali@watertech.uz";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rpc.mockReset();
  maybeSingle.mockReset();
  eq.mockClear();
});

describe("people queries: what each RPC is sent", () => {
  it("sends the range as its UTC window, and the previous equal range's start to the summary", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await fetchPeopleOverview(RANGE);
    await fetchPersonSummary(EMAIL, RANGE);
    await fetchPersonDaily(EMAIL, RANGE);
    await fetchPersonSections(EMAIL, RANGE);
    await fetchPersonRecentEvents(EMAIL);
    await fetchTopContent(RANGE);

    expect(rpc.mock.calls).toEqual([
      ["admin_people_overview", WINDOW],
      ["admin_person_summary", { p_email: EMAIL, ...WINDOW, p_prev_from: PREVIOUS_START }],
      ["admin_person_daily", { p_email: EMAIL, ...WINDOW }],
      ["admin_person_sections", { p_email: EMAIL, ...WINDOW }],
      ["admin_person_recent_events", { p_email: EMAIL, p_limit: RECENT_EVENTS_LIMIT }],
      ["admin_top_content", { ...WINDOW, p_limit: TOP_CONTENT_LIMIT }],
    ]);
  });

  it("keeps the limits inside what the SQL accepts (1-100)", () => {
    for (const limit of [RECENT_EVENTS_LIMIT, TOP_CONTENT_LIMIT]) {
      expect(limit).toBeGreaterThanOrEqual(1);
      expect(limit).toBeLessThanOrEqual(100);
    }
  });
});

describe("people queries: every widget fails alone", () => {
  it("turns an RPC error into { ok: false }, logged, never a zero", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom", code: "WT400" } });
    expect(await fetchPeopleOverview(RANGE)).toEqual({ ok: false });
    expect(await fetchPersonSummary(EMAIL, RANGE)).toEqual({ ok: false });
    expect(console.error).toHaveBeenCalled();
  });

  it("turns rows of an unexpected shape into { ok: false }", async () => {
    rpc.mockResolvedValue({ data: [{ section: "faq", active_ms: -5, visits: 1 }], error: null });
    expect(await fetchPersonSections(EMAIL, RANGE)).toEqual({ ok: false });
  });

  it("labels top content from the content bundle", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          view_type: "objection_view",
          view_entity_id: "obj-qimmat",
          view_path: "/sales-process/scripts",
          views: 3,
          copies: 1,
          people: 2,
        },
      ],
      error: null,
    });
    expect(await fetchTopContent(RANGE)).toEqual({
      ok: true,
      data: [
        {
          label: "Qimmat",
          adminHref: "/admin/objections/obj-qimmat",
          viewType: "objection_view",
          entityId: "obj-qimmat",
          path: "/sales-process/scripts",
          views: 3,
          copies: 1,
          people: 2,
        },
      ],
    });
  });
});

describe("getPersonRecord", () => {
  it("reads the allow-list row by its lowercased email", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        email: EMAIL,
        full_name: "Ali Valiyev",
        role: "manager",
        is_active: true,
        created_at: "2026-09-01T10:00:00+00:00",
      },
      error: null,
    });
    expect(await getPersonRecord("Ali@WaterTech.uz")).toEqual({
      email: EMAIL,
      fullName: "Ali Valiyev",
      role: "manager",
      isActive: true,
      addedAt: "2026-09-01T10:00:00.000Z",
    });
    expect(eq).toHaveBeenCalledWith("email", EMAIL);
  });

  it("is null when there is no row, or the email is not one (→ notFound)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getPersonRecord(EMAIL)).toBeNull();
    expect(await getPersonRecord("not-an-email")).toBeNull();
  });

  it("throws on a read error instead of answering 'not found'", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "timeout" } });
    await expect(getPersonRecord(EMAIL)).rejects.toThrow(/allowed_users/);
  });
});
