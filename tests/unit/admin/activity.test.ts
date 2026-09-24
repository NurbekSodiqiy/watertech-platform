import { describe, expect, it } from "vitest";
import {
  ACTIVITY_MAX_PAGE,
  ACTIVITY_PAGE_SIZE,
  accessRowToItem,
  activeSources,
  activityFilterParams,
  activityKey,
  activityWindow,
  activityWindowSize,
  compareActivity,
  describeAccessChange,
  editHref,
  escapeLike,
  gateRowToItem,
  historyHref,
  mergeActivity,
  parseActivityFilters,
  versionRowToItem,
  type AccessActivity,
  type ActivityFilters,
  type ActivityItem,
  type GateActivity,
  type VersionActivity,
} from "@/lib/admin/activity";

function version(id: number, at: string, overrides: Partial<VersionActivity> = {}): VersionActivity {
  return {
    kind: "version",
    id,
    at,
    actor: "admin@test",
    table: "content_faqs",
    rowId: `faq-${id}`,
    title: `FAQ ${id}`,
    op: "update",
    ...overrides,
  };
}

function gate(id: number, at: string, overrides: Partial<GateActivity> = {}): GateActivity {
  return { kind: "gate", id, at, actor: "admin@test", table: "content_faqs", rowId: `faq-${id}`, title: null, passed: true, ...overrides };
}

function access(id: number, at: string, overrides: Partial<AccessActivity> = {}): AccessActivity {
  return { kind: "access", id, at, actor: "admin@test", targetEmail: "op@test", action: "update", changes: [], ...overrides };
}

const keys = (items: readonly ActivityItem[]): string[] => items.map(activityKey);

describe("compareActivity / mergeActivity", () => {
  it("orders the three sources newest first", () => {
    const merged = mergeActivity(
      [
        [version(1, "2026-09-20T10:00:00+00:00"), version(2, "2026-09-18T10:00:00+00:00")],
        [gate(1, "2026-09-19T10:00:00+00:00")],
        [access(1, "2026-09-21T10:00:00+00:00")],
      ],
      { page: 1 }
    );
    expect(keys(merged.items)).toEqual(["access:1", "version:1", "gate:1", "version:2"]);
    expect(merged.hasMore).toBe(false);
  });

  it("compares instants, not strings — offsets and precision do not reorder rows", () => {
    // 12:00 at +05:00 is 07:00Z, earlier than 09:00Z although "12" > "09" as text.
    const earlier = version(1, "2026-09-20T12:00:00+05:00");
    const later = version(2, "2026-09-20T09:00:00.123456+00:00");
    expect(keys([earlier, later].sort(compareActivity))).toEqual(["version:2", "version:1"]);
  });

  it("breaks a tie on the instant by source, then by the higher id, whatever order the sources arrive in", () => {
    const at = "2026-09-20T10:00:00+00:00";
    const items = [access(9, at), gate(9, at), version(3, at), version(7, at)];
    const expected = ["version:7", "version:3", "gate:9", "access:9"];
    expect(keys([...items].sort(compareActivity))).toEqual(expected);
    expect(keys([...items].reverse().sort(compareActivity))).toEqual(expected);
    expect(keys(mergeActivity([[access(9, at)], [gate(9, at)], [version(3, at), version(7, at)]], { page: 1 }).items)).toEqual(expected);
  });

  it("cuts pages out of the merged order and reports whether an older one exists", () => {
    const versions = Array.from({ length: 30 }, (_, i) => version(100 - i, `2026-09-${String(30 - i).padStart(2, "0")}T10:00:00+00:00`));
    const gates = [gate(1, "2026-09-29T12:00:00+00:00")];

    const first = mergeActivity([versions, gates], { page: 1, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.hasMore).toBe(true);
    // The gate report sits between the 09-30 and 09-29 versions.
    expect(keys(first.items).slice(0, 3)).toEqual(["version:100", "gate:1", "version:99"]);

    const last = mergeActivity([versions, gates], { page: 4, pageSize: 10 });
    expect(last.items).toHaveLength(1);
    expect(last.hasMore).toBe(false);

    const pages = [1, 2, 3, 4].flatMap((page) => mergeActivity([versions, gates], { page, pageSize: 10 }).items);
    expect(keys(pages)).toEqual(keys([...versions, ...gates].sort(compareActivity)));
  });

  it("is exact at the page boundary: a full last page has no older one", () => {
    const rows = Array.from({ length: 20 }, (_, i) => version(i + 1, `2026-09-${String(i + 1).padStart(2, "0")}T00:00:00+00:00`));
    expect(mergeActivity([rows], { page: 2, pageSize: 10 }).hasMore).toBe(false);
    expect(mergeActivity([rows.slice(1)], { page: 2, pageSize: 10 }).hasMore).toBe(false);
    expect(mergeActivity([rows], { page: 1, pageSize: 10 }).hasMore).toBe(true);
  });

  it("returns an empty page for no sources and for a page past the end", () => {
    expect(mergeActivity([], { page: 1 })).toEqual({ items: [], hasMore: false });
    expect(mergeActivity([[version(1, "2026-09-20T10:00:00+00:00")]], { page: 3 })).toEqual({ items: [], hasMore: false });
  });

  it("is only correct when each source is read from its top down to the page's window", () => {
    // Even ranks are edits, odd ranks gate runs: global rows 11-20 are each
    // source's rows 6-10, not rows 11-20 of each.
    const at = (rank: number): string => new Date(Date.UTC(2026, 8, 1) + (1000 - rank) * 60_000).toISOString();
    const versions = Array.from({ length: 30 }, (_, i) => version(500 - i, at(i * 2)));
    const gates = Array.from({ length: 30 }, (_, i) => gate(900 - i, at(i * 2 + 1)));
    const pageSize = 10;
    const truth = keys([...versions, ...gates].sort(compareActivity).slice(pageSize, pageSize * 2));

    // Each source read down to the window: exact.
    const window = activityWindowSize(2, pageSize);
    const exact = mergeActivity([versions.slice(0, window), gates.slice(0, window)], { page: 2, pageSize });
    expect(keys(exact.items)).toEqual(truth);

    // The tempting shortcut — the same offset applied inside every source — is not.
    const perSourceOffset = mergeActivity([versions.slice(pageSize), gates.slice(pageSize)], { page: 1, pageSize });
    expect(keys(perSourceOffset.items)).not.toEqual(truth);
  });
});

describe("paging constants", () => {
  it("reads page p of each source down to row p * pageSize + 1", () => {
    expect(activityWindowSize(1)).toBe(ACTIVITY_PAGE_SIZE + 1);
    expect(activityWindowSize(3, 10)).toBe(31);
  });

  it("keeps the deepest page's window inside PostgREST's max-rows", () => {
    expect(activityWindowSize(ACTIVITY_MAX_PAGE)).toBeLessThanOrEqual(1000);
    expect(activityWindowSize(ACTIVITY_MAX_PAGE + 1)).toBeGreaterThan(1000);
  });
});

describe("parseActivityFilters", () => {
  it("reads every filter", () => {
    expect(
      parseActivityFilters({ source: "gate", table: "content_faqs", actor: "  a@test ", from: "2026-09-01", to: "2026-09-10" })
    ).toEqual({ source: "gate", table: "content_faqs", actor: "a@test", from: "2026-09-01", to: "2026-09-10" });
  });

  it("drops what does not parse instead of failing", () => {
    expect(
      parseActivityFilters({ source: "everything", table: "users; drop table", actor: "   ", from: "yesterday", to: "2026-13-45" })
    ).toEqual({ source: null, table: null, actor: null, from: null, to: null });
    expect(parseActivityFilters({}).table).toBeNull();
    // A prototype key is not a content table.
    expect(parseActivityFilters({ table: "constructor" }).table).toBeNull();
  });

  it("takes the first of a repeated param and swaps a reversed range", () => {
    expect(parseActivityFilters({ source: ["access", "gate"] }).source).toBe("access");
    const reversed = parseActivityFilters({ from: "2026-09-10", to: "2026-09-01" });
    expect([reversed.from, reversed.to]).toEqual(["2026-09-01", "2026-09-10"]);
  });

  it("caps the actor length", () => {
    expect(parseActivityFilters({ actor: "x".repeat(500) }).actor).toHaveLength(200);
  });

  it("round-trips through activityFilterParams", () => {
    const filters: ActivityFilters = { source: "version", table: "content_sops", actor: "a@test", from: "2026-09-01", to: null };
    const params = Object.fromEntries(activityFilterParams(filters));
    expect(parseActivityFilters(params)).toEqual(filters);
    expect(activityFilterParams({ source: null, table: null, actor: null, from: null, to: null }).toString()).toBe("");
  });
});

describe("activeSources / activityWindow / escapeLike", () => {
  const none: ActivityFilters = { source: null, table: null, actor: null, from: null, to: null };

  it("reads every source unless a filter rules one out", () => {
    expect(activeSources(none)).toEqual(["version", "gate", "access"]);
    expect(activeSources({ ...none, source: "gate" })).toEqual(["gate"]);
    // access_audit has no table, so a table filter can only mean the content histories.
    expect(activeSources({ ...none, table: "content_faqs" })).toEqual(["version", "gate"]);
    expect(activeSources({ ...none, table: "content_faqs", source: "access" })).toEqual([]);
  });

  it("turns Tashkent days into a half-open UTC window", () => {
    expect(activityWindow(none)).toEqual({ fromUTC: null, toUTC: null });
    expect(activityWindow({ ...none, from: "2026-09-10", to: "2026-09-11" })).toEqual({
      fromUTC: "2026-09-09T19:00:00.000Z",
      toUTC: "2026-09-11T19:00:00.000Z",
    });
  });

  it("escapes LIKE wildcards so an actor is matched literally", () => {
    expect(escapeLike("service_role")).toBe("service\\_role");
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
    expect(escapeLike("plain@test")).toBe("plain@test");
  });
});

describe("row mappers", () => {
  it("maps a version row and falls back to the row id for a title-less snapshot", () => {
    const row = { id: 5, created_at: "2026-09-20T10:00:00+00:00", table_name: "content_faqs", row_id: "faq-x", actor: null, op: "delete", title: null };
    expect(versionRowToItem(row)).toEqual({
      kind: "version", id: 5, at: row.created_at, actor: null, table: "content_faqs", rowId: "faq-x", title: "faq-x", op: "delete",
    });
    expect(versionRowToItem({ ...row, title: "  " })?.title).toBe("faq-x");
    expect(versionRowToItem({ ...row, title: "Narx?" })?.title).toBe("Narx?");
  });

  it("skips a row of a table the registry does not know or an op the feed does not show", () => {
    const row = { id: 5, created_at: "2026-09-20T10:00:00+00:00", table_name: "content_faqs", row_id: "x", actor: null, op: "update", title: null };
    expect(versionRowToItem({ ...row, table_name: "users" })).toBeNull();
    expect(versionRowToItem({ ...row, op: "insert" })).toBeNull();
    expect(gateRowToItem({ id: 1, created_at: row.created_at, table_name: "users", row_id: "x", actor: null, passed: false })).toBeNull();
    expect(accessRowToItem({ id: 1, created_at: row.created_at, actor: "a", target_email: "b", action: "truncate", before: null, after: null })).toBeNull();
  });

  it("maps a gate row with the title still to resolve", () => {
    expect(gateRowToItem({ id: 2, created_at: "2026-09-20T10:00:00+00:00", table_name: "content_sops", row_id: "sop-1", actor: "m@test", passed: false })).toEqual({
      kind: "gate", id: 2, at: "2026-09-20T10:00:00+00:00", actor: "m@test", table: "content_sops", rowId: "sop-1", title: null, passed: false,
    });
  });
});

describe("describeAccessChange", () => {
  it("lists only the fields an update changed", () => {
    expect(describeAccessChange("update", { role: "operator", is_active: true }, { role: "manager", is_active: true })).toEqual([
      { field: "role", from: "operator", to: "manager" },
    ]);
    expect(describeAccessChange("update", { role: "operator", is_active: true }, { role: "operator", is_active: false })).toEqual([
      { field: "is_active", from: true, to: false },
    ]);
    expect(describeAccessChange("update", { role: "operator", is_active: true }, { role: "operator", is_active: true })).toEqual([]);
  });

  it("describes the 0020 conversion of the owner's row like any role change", () => {
    // 0020 turns every pre-existing 'manager' row (the CMS owner) into 'admin';
    // the audit trigger records it as an ordinary update, actor = the DB login.
    expect(describeAccessChange("update", { role: "manager", is_active: true }, { role: "admin", is_active: true })).toEqual([
      { field: "role", from: "manager", to: "admin" },
    ]);
  });

  it("lists what an insert started with and what a delete had", () => {
    expect(describeAccessChange("insert", null, { email: "a@test", role: "operator", is_active: true })).toEqual([
      { field: "role", from: null, to: "operator" },
      { field: "is_active", from: null, to: true },
    ]);
    expect(describeAccessChange("delete", { role: "manager", is_active: false }, null)).toEqual([
      { field: "role", from: "manager", to: null },
      { field: "is_active", from: false, to: null },
    ]);
  });

  it("tolerates a row from before is_active existed and malformed snapshots", () => {
    expect(describeAccessChange("insert", null, { role: "operator" })).toEqual([{ field: "role", from: null, to: "operator" }]);
    expect(describeAccessChange("update", "nope", [1, 2])).toEqual([]);
  });
});

describe("links", () => {
  it("points at the row's editor and its version history", () => {
    expect(editHref("content_faqs", "faq-1")).toBe("/admin/faq/faq-1");
    expect(editHref("content_package_groups", "g-1")).toBe("/admin/packages/groups/g-1");
    expect(historyHref("content_faqs", "faq-1")).toBe("/admin/versions/content_faqs/faq-1");
    expect(historyHref("content_faqs", "a b")).toBe("/admin/versions/content_faqs/a%20b");
  });
});
