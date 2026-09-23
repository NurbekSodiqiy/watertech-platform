import { describe, expect, it } from "vitest";
import { DEFAULT_TABLE_STATE, parseTableState, serializeTableState, type TableState } from "@/lib/admin/table-state";

describe("parseTableState", () => {
  it("returns the default state for an empty query string", () => {
    expect(parseTableState(new URLSearchParams(""))).toEqual(DEFAULT_TABLE_STATE);
  });

  it("reads a fully-specified state back", () => {
    const params = new URLSearchParams("tab=draft&q=narx&sort=name&dir=desc&page=3&size=50");
    expect(parseTableState(params)).toEqual({
      tab: "draft",
      query: "narx",
      sortKey: "name",
      sortDir: -1,
      page: 3,
      pageSize: 50,
    });
  });

  it("falls back to defaults for unknown or malformed values", () => {
    const params = new URLSearchParams("tab=archived&page=-1&size=17&dir=sideways");
    const state = parseTableState(params);
    expect(state.tab).toBe("all");
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(25);
    expect(state.sortDir).toBe(1);
  });

  it("defaults sort direction to ascending when a sort key is set without dir", () => {
    const state = parseTableState(new URLSearchParams("sort=updated_at"));
    expect(state.sortKey).toBe("updated_at");
    expect(state.sortDir).toBe(1);
  });
});

describe("serializeTableState", () => {
  it("produces an empty query string for the default state", () => {
    expect(serializeTableState(DEFAULT_TABLE_STATE)).toBe("");
  });

  it("omits any field still at its default and keeps the rest", () => {
    const state: TableState = { tab: "published", query: "", sortKey: null, sortDir: 1, page: 1, pageSize: 25 };
    expect(serializeTableState(state)).toBe("?tab=published");
  });

  it("round-trips a fully-specified state through parseTableState", () => {
    const state: TableState = { tab: "draft", query: "narx", sortKey: "name", sortDir: -1, page: 3, pageSize: 50 };
    const qs = serializeTableState(state);
    const roundTripped = parseTableState(new URLSearchParams(qs.replace(/^\?/, "")));
    expect(roundTripped).toEqual(state);
  });

  it("omits dir when sorting ascending but still records the sort key", () => {
    const state: TableState = { ...DEFAULT_TABLE_STATE, sortKey: "name", sortDir: 1 };
    const qs = serializeTableState(state);
    expect(qs).toBe("?sort=name");
  });
});
