/** DataTable's URL state (CLAUDE.md §4: same-route param changes go through
 * `window.history.replaceState`, never `router.push`) — parsing and
 * serializing pulled out as pure functions so they're unit-testable without
 * mounting the client component. */

export type StatusTab = "all" | "published" | "draft";

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface TableState {
  tab: StatusTab;
  query: string;
  sortKey: string | null;
  sortDir: 1 | -1;
  /** 1-based. */
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_TABLE_STATE: TableState = {
  tab: "all",
  query: "",
  sortKey: null,
  sortDir: 1,
  page: 1,
  pageSize: 25,
};

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

/** Reads DataTable's state back out of the URL — an unknown/malformed value
 * for any param falls back to its default rather than throwing, since a
 * manager can always hand-edit or bookmark the URL. */
export function parseTableState(params: URLSearchParams): TableState {
  const tabRaw = params.get("tab");
  const tab: StatusTab = tabRaw === "published" || tabRaw === "draft" ? tabRaw : "all";

  const query = params.get("q") ?? "";
  const sortKey = params.get("sort") || null;
  const sortDir: 1 | -1 = params.get("dir") === "desc" ? -1 : 1;

  const pageRaw = Number(params.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const sizeRaw = Number(params.get("size"));
  const pageSize = isPageSize(sizeRaw) ? sizeRaw : 25;

  return { tab, query, sortKey, sortDir, page, pageSize };
}

/** The inverse of `parseTableState` — omits every param still at its default,
 * so the common case (fresh list, no filter) leaves the URL bare. Returns the
 * `?query` string (empty string when nothing needs recording), what
 * `history.replaceState` is called with. */
export function serializeTableState(state: TableState): string {
  const params = new URLSearchParams();
  if (state.tab !== "all") params.set("tab", state.tab);
  if (state.query) params.set("q", state.query);
  if (state.sortKey) {
    params.set("sort", state.sortKey);
    if (state.sortDir === -1) params.set("dir", "desc");
  }
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.pageSize !== 25) params.set("size", String(state.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
